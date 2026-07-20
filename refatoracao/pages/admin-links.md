# Admin — Links

> Arquivo: `v2/frontend/src/app/(app)/admin/links/page.tsx`
> Linhas: ~565
> Atualizado em: 2026-04-01

---

## 1. Resumo executivo

A página de Links é um CRUD administrativo funcional e visualmente consistente com o design system do projeto. O problema central não é ela individualmente — é o fato de ser quasi-idêntica às páginas de Documentos e Notas, gerando ~1.500 linhas de duplicação entre as três. Esta página é o ponto de partida ideal para a refatoração justamente por ser a mais simples das três (sem upload de arquivo, sem modal de preview de conteúdo). O padrão extraído aqui será aplicado diretamente nas outras duas.

**Prioridade de revisão:** Alta

---

## 2. O que está bom

- **Design system respeitado:** Usa consistentemente as classes `fac-*` (`fac-page`, `fac-page-head`, `fac-panel`, `fac-card`, `fac-button-primary`, `fac-tabs`, `fac-form-card`, etc.)
- **`useMemo` para filtragem:** A lista filtrada é memorizada corretamente, evitando recálculos desnecessários
- **Busca integrada ao `ui-store`:** O `globalSearch` vem do store global — a busca na topbar funciona automaticamente nessa página sem configuração adicional
- **Preview do card em tempo real:** A aba Visual tem um preview ao vivo do card com a imagem e posição configuradas
- **ImageSelector com galeria:** O seletor de imagens já está integrado com a galeria de uploads, evitando duplicação de uploads
- **Lógica de escopo por role:** A distinção entre SUPERADMIN (vê tudo) e USER (vê apenas os próprios) está corretamente implementada na chamada da API e no filtro de cliente
- **`Promise.all` para carregamento paralelo:** Links e categorias são buscados simultaneamente
- **Cleanup de request:** O padrão `let active = true` não está na `load()` da página de links (está na home), mas `Promise.all` aqui não tem race condition porque a função não é chamada concorrentemente
- **Payload limpo no save:** Campos opcionais são enviados como `undefined` em vez de string vazia, o que deixa o backend limpo

---

## 3. O que está ruim

### 3.1 · Três funções utilitárias duplicadas de outros arquivos

```typescript
// Duplicadas em home, schedules, notes e aqui:
function normalizeImagePosition(position?: string | null) { ... }  // linha 27
function resolveImageUrl(path?: string | null) { ... }             // linha 34 — nome diferente dos outros!
function getErrorMessage(error: unknown, fallback: string) { ... } // linha 39
```

O nome `resolveImageUrl` (só nesse arquivo) vs `resolveFileUrl` (nos outros três) é um bug silencioso — mesma função, nome diferente, sem contrato explícito.

### 3.2 · `load()` sem `useCallback` e fora do `useEffect`

```typescript
const load = async () => { ... };         // linha 64
useEffect(() => {
  void load();
}, [isSuperadmin, user?.id]);             // 'load' não está nas dependências
```

Viola o modelo de dependências do React. `load` é recriada a cada render, mas o `useEffect` não a lista como dependência — funciona por acidente porque os triggers corretos (`isSuperadmin`, `user?.id`) estão listados. O ESLint com `react-hooks/exhaustive-deps` sinalizaria isso.

### 3.3 · `window.confirm()` para deleção

```typescript
const remove = async (link: Link) => {
  if (!window.confirm(`Remover link ${link.title}?`)) return; // linha 188
  ...
};
```

Diálogo nativo do browser: sem estilo, sem acessibilidade gerenciada, sem botão de foco correto, bloqueia event loop.

### 3.4 · `toggleStatus()` e `remove()` sem `try/catch`

```typescript
const toggleStatus = async (link: Link) => {
  await api.patch(`/links/${link.id}`, { ... }); // sem try/catch
  await load();
};
```

Se a chamada falhar, o interceptor do Axios exibe um toast de erro, mas o `load()` nunca é chamado — o estado local fica desatualizado até o próximo reload manual.

### 3.5 · Botão de "Filtros" sem funcionalidade

```tsx
<button type="button" className="fac-filter-button">
  Filtros
</button>
```

Botão decorativo sem onClick, sem estado, sem funcionalidade implementada. Engana o usuário.

### 3.6 · Sem validação inline nos campos do formulário

O botão Salvar fica desabilitado quando título ou URL estão vazios, mas sem nenhuma mensagem explicando por quê. O usuário não sabe qual campo está faltando.

### 3.7 · Toggle de status como `<span>` com onClick dentro de `<button>`

```tsx
<button type="button" ... onClick={() => openEdit(link)}>
  ...
  <span
    className="fac-toggle shrink-0"
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      void toggleStatus(link);
    }}
  >
```

Um `<span>` com `onClick` dentro de um `<button>` é semanticamente incorreto. O `<span>` não é focusável por teclado — usuários de teclado não conseguem alternar o status sem abrir o modal de edição.

### 3.8 · `imagePosition` useMemo duplicado

```typescript
const imagePosition = useMemo(() => {
  // lógica de parse idêntica em links, schedules e notes
}, [form.imagePosition]);
```

Deveria ser uma função utilitária em `lib/image.ts`.

### 3.9 · Estados de loading/error/empty com markup inconsistente com o design system

```tsx
{loading ? (
  <p className="text-[14px] text-muted-foreground">Carregando links...</p>
) : error ? (
  <p className="text-[14px] text-red-700">{error}</p>   // usa text-red-700 direto, não fac-error-state
) : ...}
```

O CSS define `fac-empty-state`, `fac-loading-state` e `fac-error-state`, mas esses estados dentro do panel usam markup ad-hoc.

---

## 4. O que está repetido ou mal distribuído

Veja o catálogo completo em [shared/repeated-patterns.md](../shared/repeated-patterns.md).

**Resumo do que está duplicado nesta página:**

| Item | Duplicado em |
|---|---|
| `normalizeImagePosition()` | home, schedules, notes |
| `resolveImageUrl()` | home (resolveFileUrl), schedules, notes |
| `getErrorMessage()` | home, schedules, notes, backup |
| Estrutura de estado (10+ useState) | schedules, notes |
| `load()` + useEffect | schedules, notes |
| `openCreate()` / `openEdit()` / `save()` | schedules, notes |
| `toggleStatus()` / `remove()` | schedules, notes |
| `imagePosition` useMemo | schedules, notes |
| Cards JSX (imagem, badge, rodapé) | home, schedules, notes |
| Modal com tabs BASIC/CATEGORY/VISUAL | schedules, notes |
| Visual tab (ImageSelector + sliders + preview) | schedules, notes |
| Header de página (título + filtro + botão) | schedules, notes |

---

## 5. O que pode ser removido ou simplificado

- As três funções locais (`normalizeImagePosition`, `resolveImageUrl`, `getErrorMessage`) podem ser deletadas após a extração para `lib/`
- O botão "Filtros" sem funcionalidade pode ser removido ou deixado com `disabled` até ser implementado
- O `useMemo` de `imagePosition` pode ser substituído por uma chamada à função `parseImagePosition` de `lib/image.ts`
- O `isSuperadmin` é calculado como `user?.role === 'SUPERADMIN'` — isso se repete em várias páginas e poderia ser um seletor do auth-store ou um hook

---

## 6. Problemas de arquitetura e organização

### 6.1 · Página com 4 responsabilidades distintas

O `LinksPage` faz:
1. Fetch e gerenciamento de estado da lista
2. Gerenciamento do formulário de criação/edição
3. Renderização da lista (cards)
4. Renderização do formulário (modal com 3 abas)

Uma página que faz tanto é difícil de testar, difícil de reutilizar e difícil de entender.

### 6.2 · Formulário inline sem estrutura de formulário HTML

O formulário de criação/edição não usa `<form>` com `onSubmit`. Usa `<button onClick={save}>`. Consequências:
- Não suporta submit por teclado (Enter no campo)
- Não suporta atributos nativos de formulário (`required`, `pattern`, etc.)
- Dificulta integração com bibliotecas de formulário no futuro

### 6.3 · Payload construído manualmente no `save()`

```typescript
const payload = {
  title: form.title,
  url: form.url,
  description: form.description || undefined,
  categoryId: form.categoryId || undefined,
  // ...
  visibility: isSuperadmin ? form.visibility : 'PRIVATE',
  publicToken: isSuperadmin && form.visibility === 'PUBLIC' ? form.publicToken || undefined : undefined,
};
```

Lógica de negócio misturada na construção do payload. A regra "USER sempre tem PRIVATE" e "publicToken só existe para SUPERADMIN + PUBLIC" são regras de domínio que já existem no backend — duplicá-las no frontend cria divergência potencial.

---

## 7. Referências e padrões externos

### Padrão de CRUD com hook

Projetos maduros em React separam a lógica de dados de UI em hooks específicos. O padrão mais comum para admin CRUDs é:

```typescript
// Hook encapsula fetch, estado e operações
const { items, loading, error, create, update, remove, toggleStatus } = useLinks();

// Componente só renderiza
function LinksPage() {
  const { items, loading, ... } = useLinks();
  return <...>;
}
```

**Referência:** Padrão amplamente usado em projetos com React Query, SWR ou hooks customizados. Não requer nenhuma biblioteca nova — é organização de código.

### Confirmação de deleção com foco gerenciado

Produtos como Linear, Notion, Vercel usam modais de confirmação inline (não `window.confirm`) com:
- Botão de foco automático no "Cancelar" (default seguro)
- Texto descritivo do que será deletado
- Feedback visual de loading no botão de confirmação

### Validação de formulário inline

A convenção moderna é validação por campo no momento que o usuário sai do campo (`onBlur`) ou no submit, com mensagem abaixo do campo:

```tsx
<input className={`fac-input ${errors.title ? 'border-destructive' : ''}`} />
{errors.title && <p className="text-[12px] text-destructive">{errors.title}</p>}
```

Sem biblioteca externa necessária para o nível de validação atual do projeto.

---

## 8. O que vamos mudar

1. **Extrair para `lib/image.ts`:** `normalizeImagePosition`, `resolveAssetUrl` (unifica `resolveFileUrl` e `resolveImageUrl`), `parseImagePosition`
2. **Extrair para `lib/error.ts`:** `getApiErrorMessage` (unifica `getErrorMessage` e `parseErrorMessage` do api.ts)
3. **Criar `<ConfirmModal>`:** Substituir `window.confirm` em todas as deleções
4. **Corrigir o padrão `load()` + `useEffect`:** Usar `useCallback` com dependências corretas
5. **Adicionar `try/catch` em `toggleStatus` e `remove`:** Garantir que `load()` seja chamado mesmo em erro
6. **Substituir `<span onClick>` pelo toggle dentro de `<button>` separado:** Corrigir acessibilidade do toggle de status
7. **Usar classes do design system nos estados:** `fac-empty-state`, `fac-loading-state`, `fac-error-state`
8. **Corrigir acentuação:** "Basico" → "Básico", "Categorizacao" → "Categorização"
9. **Remover ou desabilitar o botão "Filtros" não implementado**
10. **Adicionar feedback de validação por campo:** Ao menos para título e URL

---

## 9. Plano de refatoração

As etapas abaixo devem ser seguidas nesta ordem. Cada etapa é independente — pode ser commitada separadamente.

---

### Etapa 1 — Criar utilitários em `lib/`

**Arquivos a criar/modificar:**
- `lib/image.ts` (novo)
- `lib/error.ts` (novo)

**O que fazer:**

Criar `lib/image.ts` com:
```typescript
export function normalizeImagePosition(position?: string | null): string { ... }
export function resolveAssetUrl(path?: string | null): string { ... }
export function parseImagePosition(position: string): { x: number; y: number } { ... }
```

Criar `lib/error.ts` com:
```typescript
export function getApiErrorMessage(error: unknown, fallback: string): string { ... }
```

Depois, substituir as funções locais de `admin/links/page.tsx` pelas importações dos novos arquivos.

**Impacto:** Nenhum risco de regressão. Comportamento idêntico.

**Atenção:** Ao criar `lib/image.ts`, já importar em `home/page.tsx`, `admin/schedules`, `admin/notes` e remover as cópias locais — para que o benefício seja total desde o início.

---

### Etapa 2 — Corrigir acessibilidade do toggle de status

**Arquivo:** `app/(app)/admin/links/page.tsx`

**O que fazer:** O `<span>` com `onClick` dentro do `<button>` de edição precisa ser extraído para um `<button>` separado fora do card principal, ou o card inteiro precisa ser reestruturado para separar a área de edição do toggle.

**Estrutura sugerida:**
```tsx
<article className="fac-card ...">
  {/* Área clicável para editar — não envolve o toggle */}
  <button type="button" onClick={() => openEdit(link)} className="...">
    {/* imagem + categoria */}
    {/* rodapé com título */}
  </button>

  {/* Toggle separado, fora do button de edição */}
  <div className="...">
    <button
      type="button"
      role="switch"
      aria-checked={link.status === 'ACTIVE'}
      className="fac-toggle"
      onClick={() => void toggleStatus(link)}
    >
      <span className="fac-toggle-dot" />
    </button>
  </div>
</article>
```

**Impacto:** Quebra visual possível — validar layout após a mudança.

---

### Etapa 3 — Criar `<ConfirmModal>`

**Arquivo a criar:** `components/admin/confirm-modal.tsx`

**Props sugeridas:**
```typescript
type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;  // padrão: "Remover"
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};
```

**O que fazer:** Implementar usando o `AdminModal` existente. Adicionar botão de foco automático no "Cancelar" (comportamento seguro por padrão).

Depois, substituir em `admin/links/page.tsx`:
```typescript
// De:
const remove = async (link: Link) => {
  if (!window.confirm(`Remover link ${link.title}?`)) return;
  await api.delete(`/links/${link.id}`);
  await load();
};

// Para:
const [confirmTarget, setConfirmTarget] = useState<Link | null>(null);
const remove = async () => {
  if (!confirmTarget) return;
  setRemoving(true);
  try {
    await api.delete(`/links/${confirmTarget.id}`);
    setConfirmTarget(null);
    await load();
  } catch { /* erro tratado pelo interceptor */ }
  finally { setRemoving(false); }
};
```

**Impacto:** Muda o fluxo de deleção — validar que o modal abre e fecha corretamente.

---

### Etapa 4 — Corrigir `load()` + `useEffect`

**Arquivo:** `app/(app)/admin/links/page.tsx`

**O que fazer:**

```typescript
// De:
const load = async () => { ... };
useEffect(() => { void load(); }, [isSuperadmin, user?.id]);

// Para (opção com useCallback):
const load = useCallback(async () => {
  setLoading(true);
  setError(null);
  try { ... }
  catch (err: unknown) { ... }
  finally { setLoading(false); }
}, [isSuperadmin, user?.id, user]);

useEffect(() => {
  void load();
}, [load]);
```

**Atenção:** Verificar que não cria loop de re-fetch. As dependências do `useCallback` devem incluir apenas os valores que realmente mudam o resultado do fetch.

---

### Etapa 5 — Adicionar `try/catch` em `toggleStatus` e `remove`

**Arquivo:** `app/(app)/admin/links/page.tsx`

```typescript
// toggleStatus: garantir que load() é chamado mesmo em erro
const toggleStatus = async (link: Link) => {
  try {
    await api.patch(`/links/${link.id}`, {
      status: link.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    });
  } catch {
    // Erro já notificado pelo interceptor
  } finally {
    await load();
  }
};
```

**Impacto:** Mínimo. Apenas garante que o estado local seja atualizado mesmo em erro.

---

### Etapa 6 — Feedback de validação por campo

**Arquivo:** `app/(app)/admin/links/page.tsx`

**O que fazer:** Adicionar um estado `errors` e mensagens inline abaixo dos campos obrigatórios.

```typescript
const [errors, setErrors] = useState<{ title?: string; url?: string }>({});

const validate = () => {
  const next: typeof errors = {};
  if (!form.title.trim()) next.title = 'Título é obrigatório';
  if (!form.url.trim()) next.url = 'URL é obrigatória';
  setErrors(next);
  return Object.keys(next).length === 0;
};

const save = async () => {
  if (!validate()) return;
  // ...
};
```

No JSX:
```tsx
<input className={`fac-input ${errors.title ? 'border-destructive' : ''}`} ... />
{errors.title && <p className="mt-1 text-[12px] text-destructive">{errors.title}</p>}
```

**Impacto:** Melhoria de UX sem risco de regressão.

---

### Etapa 7 — Usar classes do design system nos estados inline

**Arquivo:** `app/(app)/admin/links/page.tsx`

```tsx
// De:
{loading ? (
  <p className="text-[14px] text-muted-foreground">Carregando links...</p>
) : error ? (
  <p className="text-[14px] text-red-700">{error}</p>
) : filtered.length === 0 ? (
  <p className="text-[14px] text-muted-foreground">Nenhum link encontrado.</p>
) : ...}

// Para:
{loading ? (
  <div className="fac-loading-state">Carregando links...</div>
) : error ? (
  <div className="fac-error-state">{error}</div>
) : filtered.length === 0 ? (
  <div className="fac-empty-state">Nenhum link encontrado.</div>
) : ...}
```

**Impacto:** Melhoria visual. Sem risco de regressão.

---

### Etapa 8 — Corrigir acentuação e remover botão "Filtros"

**Arquivo:** `app/(app)/admin/links/page.tsx`

- "Basico" → "Básico"
- "Categorizacao" → "Categorização"
- Botão "Filtros": remover ou adicionar `disabled` com `title="Em breve"`

---

## 10. Estrutura sugerida após refatoração

```
v2/frontend/src/
├── lib/
│   ├── image.ts          ← NOVO: normalizeImagePosition, resolveAssetUrl, parseImagePosition
│   └── error.ts          ← NOVO: getApiErrorMessage
├── components/
│   └── admin/
│       ├── confirm-modal.tsx  ← NOVO: modal de confirmação de deleção
│       └── modal.tsx          ← existente, sem mudanças
└── app/(app)/admin/links/
    └── page.tsx               ← refatorada: importa lib/, usa ConfirmModal, corrige bugs
```

---

## 11. Checklist de implementação

> Execute nesta ordem. Marque cada item ao concluir.

### Etapa 1 — Utilitários
- [x] Criar `lib/image.ts` com `normalizeImagePosition`, `resolveAssetUrl`, `parseImagePosition`
- [x] Criar `lib/error.ts` com `getApiErrorMessage`
- [x] Substituir funções locais em `admin/links/page.tsx` pelos imports
- [x] Substituir funções locais em `app/(app)/page.tsx` pelos imports
- [x] Substituir funções locais em `admin/schedules/page.tsx` pelos imports
- [x] Substituir funções locais em `admin/notes/page.tsx` pelos imports
- [ ] Verificar que não quebrou nada visualmente nas 4 páginas

### Etapa 2 — Acessibilidade do toggle
- [x] Separar a área de clique de edição do toggle de status no card
- [x] Adicionar `role="switch"` e `aria-checked` no toggle
- [ ] Verificar que o toggle funciona por teclado (Tab + Enter/Space)
- [ ] Verificar layout visual após a mudança

### Etapa 3 — ConfirmModal
- [x] Criar `components/admin/confirm-modal.tsx`
- [x] Substituir `window.confirm` em `admin/links/page.tsx`
- [x] Adicionar estado `confirmTarget` e `removing`
- [ ] Testar fluxo: abrir modal → cancelar → nada acontece
- [ ] Testar fluxo: abrir modal → confirmar → item removido → lista atualizada

### Etapa 4 — load() + useCallback
- [x] Envolver `load` em `useCallback` com dependências corretas
- [x] Atualizar o `useEffect` para depender de `load`
- [ ] Verificar que não cria loop de re-fetch (abrir DevTools → Network)

### Etapa 5 — try/catch no toggleStatus e remove
- [x] Adicionar `try/catch/finally` em `toggleStatus`
- [x] Mover `await load()` para o bloco `finally`
- [ ] Testar com uma chamada que falha (ex: desligar a API) — verificar que a lista recarrega e toast aparece

### Etapa 6 — Validação por campo
- [x] Criar estado `errors`
- [x] Criar função `validate()`
- [x] Chamar `validate()` no `save()` antes de fazer a chamada de API
- [x] Adicionar classe `border-destructive` nos inputs inválidos
- [x] Adicionar mensagem de erro abaixo de cada campo inválido
- [x] Limpar erros quando o usuário digitar no campo (`onChange`)

### Etapa 7 — Estados do design system
- [x] Substituir `<p>` de loading por `<div className="fac-loading-state">`
- [x] Substituir `<p>` de erro por `<div className="fac-error-state">`
- [x] Substituir `<p>` de vazio por `<div className="fac-empty-state">`

### Etapa 8 — Texto e limpeza
- [x] Corrigir "Basico" → "Básico"
- [x] Corrigir "Categorizacao" → "Categorização"
- [x] Remover ou desabilitar o botão "Filtros"

---

## 12. Riscos e cuidados

| Risco | Probabilidade | Mitigação |
|---|---|---|
| `load()` com `useCallback` criar loop de re-fetch | Média | Testar no DevTools → Network que só faz 1 request no mount e 1 request ao mudar de papel |
| Refatoração do card quebrar layout | Média | Comparar screenshots antes/depois em mobile e desktop |
| `ConfirmModal` não fechar após erro | Baixa | Garantir que `setConfirmTarget(null)` está no `finally`, não no `try` |
| Extrair `resolveImageUrl` para `resolveAssetUrl` e esquecer de atualizar alguma referência | Média | Fazer busca global por `resolveImageUrl` e `resolveFileUrl` antes de finalizar |
| Validação de URL — o backend valida via `@IsUrl({ require_tld: false })`, o frontend só checa se está vazio | Baixa | Não é regressão, é ausência de validação existente |

**Atenção especial:** Esta página serve de modelo para `admin/schedules` e `admin/notes`. Os padrões definidos aqui (especialmente os utilitários e o `ConfirmModal`) devem ser aplicados nas outras duas antes de considerar a refatoração concluída.
