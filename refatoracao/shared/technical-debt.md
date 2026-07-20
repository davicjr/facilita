# Dívidas Técnicas — Facilita V2 Frontend

> Escopo: `v2/frontend/src/`
> Atualizado em: 2026-04-01

---

## Dívidas por categoria

---

### CATEGORIA 1 — Código a remover imediatamente (quick wins)

---

#### TD-01 · `console.log` em produção no store de notificações

**Arquivo:** `stores/realtime-notification-store.ts` (linhas 57–65)
**Impacto:** Performance e vazamento de dados de depuração em produção
**Esforço:** 5 minutos

```typescript
// Linhas a remover:
console.log('[Store] Adding notification:', notification);
console.log('[Store] Current notifications count:', state.notifications.length);
console.log('[Store] Current unreadCount:', state.unreadCount);
console.log('[Store] New unreadCount:', newState.unreadCount);
console.log('[Store] New notifications count:', newState.notifications.length);
```

**Ação:** Deletar as 5 linhas.

---

#### TD-02 · Classe `surface` inexistente no design system

**Arquivo:** `app/(app)/admin/backup/page.tsx` (linha 106)
**Impacto:** Estilo quebrado/imprevisível nessa seção
**Esforço:** 5 minutos

```tsx
// Atual — classe 'surface' não existe
<section className="surface animate-in fade-in slide-in-from-bottom-2 p-3 sm:p-4">

// Deveria ser:
<section className="fac-panel p-3 sm:p-4">
```

**Ação:** Substituir `surface` por `fac-panel` e validar visualmente.

---

#### TD-03 · Acentuação ausente em strings de UI

**Arquivos:** `app-nav.tsx`, `app/(app)/admin/links/page.tsx`, `admin/schedules/page.tsx`, `admin/notes/page.tsx`, `user-nav-menu.tsx`
**Impacto:** Qualidade textual da interface
**Esforço:** 15 minutos

Ver lista completa em [repeated-patterns.md → D18](./repeated-patterns.md#d18--acentuação-ausente-em-strings-de-ui).

**Ação:** Busca global e substituição. Sem risco de regressão.

---

### CATEGORIA 2 — Duplicações críticas (alta prioridade)

---

#### TD-04 · Funções utilitárias copiadas em 4–5 arquivos

**Ver:** [repeated-patterns.md → D1, D2, D3](./repeated-patterns.md)

**Funções afetadas:**
- `normalizeImagePosition()` → 4 cópias
- `resolveFileUrl()` / `resolveImageUrl()` → 4 cópias com nome inconsistente
- `getErrorMessage()` → 5 cópias

**Impacto:** Qualquer bug corrigido em uma cópia não é corrigido nas outras. Já aconteceu: `admin/links` usa `resolveImageUrl` enquanto os outros três usam `resolveFileUrl` — mesma função, nome diferente.

**Ação:** Criar `lib/image.ts` e `lib/error.ts`, extrair as funções, atualizar importações.

---

#### TD-05 · 1.500 linhas de CRUD quasi-idêntico

**Arquivos:** `admin/links/page.tsx`, `admin/schedules/page.tsx`, `admin/notes/page.tsx`
**Impacto:** Manutenção multiplicada por 3. Correções precisam ser aplicadas em três lugares.
**Esforço:** Alto (refatoração estrutural)

**Ver detalhes em:** [repeated-patterns.md → D4 a D11](./repeated-patterns.md)

**Ação:** Extrair hook `useContentCrud` e componentes reutilizáveis. Fazer em etapas, começando pelo arquivo mais simples (links).

---

### CATEGORIA 3 — Qualidade de código

---

#### TD-06 · `load()` sem `useCallback` + dependências implícitas no `useEffect`

**Arquivos:** `admin/links/page.tsx`, `admin/schedules/page.tsx`, `admin/notes/page.tsx`
**Impacto:** Viola o modelo de dependências do React. Pode esconder loops de re-fetch ou execuções perdidas em situações de race condition.

**Código atual:**
```typescript
const load = async () => { /* ... */ };
useEffect(() => {
  void load();
}, [isSuperadmin, user?.id]); // 'load' não está nas dependências — ESLint react-hooks/exhaustive-deps sinalizaria isso
```

**Ação:** Usar `useCallback` ou mover a lógica para dentro do `useEffect`:
```typescript
// Opção A — useCallback
const load = useCallback(async () => { /* ... */ }, [isSuperadmin, user?.id, user]);
useEffect(() => { void load(); }, [load]);

// Opção B — lógica inline (mais simples, sem necessidade de useCallback)
useEffect(() => {
  let active = true;
  const load = async () => { /* ... */ };
  void load();
  return () => { active = false; };
}, [isSuperadmin, user?.id]);
```

---

#### TD-07 · `window.confirm()` para deleções

**Arquivos:** `admin/links/page.tsx` (188), `admin/schedules/page.tsx` (209), `admin/notes/page.tsx` (182)
**Impacto:** Inacessível, não segue o design system, bloqueia o event loop.

**Ação:** Criar `<ConfirmModal>` e substituir `window.confirm` nas três páginas.

---

#### TD-08 · `toggleStatus()` e `remove()` sem tratamento de erro local

**Arquivos:** `admin/links/page.tsx`, `admin/schedules/page.tsx`, `admin/notes/page.tsx`
**Impacto:** Se a operação falhar, o toast do interceptor aparece mas o estado local não é atualizado/revertido. O item pode parecer ativo/inativo incorretamente até a próxima recarga.

**Código atual:**
```typescript
const toggleStatus = async (item: T) => {
  await api.patch(`/${entity}/${item.id}`, { ... }); // sem try/catch
  await load();
};
```

**Ação:** Adicionar `try/catch` e tratar o estado em caso de erro (ou pelo menos garantir que `load()` seja chamado mesmo em erro para sincronizar o estado).

---

#### TD-09 · `any` types no hook de favoritos

**Arquivo:** `hooks/useFavorites.tsx`
**Impacto:** Perde o benefício do TypeScript. Erros de tipo não são detectados em tempo de compilação.

**Ocorrências:**
```typescript
link?: any;     // linha 26 — deveria ser: link?: Link
schedule?: any; // linha 27 — deveria ser: schedule?: UploadedSchedule
note?: any;     // linha 28 — deveria ser: note?: Note
// Nos catch handlers:
} catch (error: any) { // deveria ser: } catch (error: unknown) {
```

**Ação:** Importar os tipos de `types/index.ts` e substituir `any` pelos tipos corretos.

---

#### TD-10 · Tipo `EntityType` declarado em múltiplos arquivos

**Arquivos:** `types/index.ts`, `hooks/useFavorites.tsx`, `stores/realtime-notification-store.ts`
**Impacto:** Se o enum mudar, precisa ser atualizado em múltiplos lugares. Os valores em `useFavorites` (`LINK | SCHEDULE | NOTE`) são diferentes de `types/index.ts` (`LINK | SCHEDULE | NOTE | USER`).

**Ação:** Importar de `types/index.ts` e remover as declarações locais.

---

#### TD-11 · `AdminModal` com `aria-labelledby` de ID estático

**Arquivo:** `components/admin/modal.tsx` (linha 49)
**Impacto:** Se dois modais forem abertos simultaneamente (embora não aconteça hoje), ambos referenciariam o mesmo `id="admin-modal-title"`, violando a unicidade de IDs no DOM.

**Código atual:**
```tsx
<p id="admin-modal-title" className="fac-modal-title">{title}</p>
// e:
aria-labelledby="admin-modal-title"
```

**Ação:** Gerar um ID único por instância de modal (ex: `useId()` do React 18+).

---

#### TD-12 · `navCollapsed` fora do `ui-store`

**Arquivo:** `components/app-shell.tsx` (linhas 23–26, 51–57)
**Impacto:** Estado de UI gerenciado fora do store de UI. Acesso direto ao `localStorage` no componente. Se outro componente precisar saber se a nav está colapsada, não tem como sem prop drilling.

**Código atual:**
```typescript
const [navCollapsed, setNavCollapsed] = useState<boolean>(() => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('fac-nav-collapsed') === 'true';
});
const toggleNav = () => {
  setNavCollapsed((prev) => {
    const next = !prev;
    localStorage.setItem('fac-nav-collapsed', String(next));
    return next;
  });
};
```

**Ação:** Mover para `ui-store` com `persist` (middleware Zustand), assim como o tema.

---

### CATEGORIA 4 — UX e feedback

---

#### TD-13 · Formulários sem validação por campo

**Arquivos:** `admin/links/page.tsx`, `admin/schedules/page.tsx`, `admin/notes/page.tsx`
**Impacto:** O usuário não sabe qual campo está inválido. O botão "Salvar" fica desabilitado sem explicação. Péssima UX de formulário.

**Estado atual:** Validação somente no momento do submit (verificação de string vazia), sem mensagem por campo.

**Ação:** Adicionar estado de erros por campo e mensagens inline abaixo de cada input inválido.

---

#### TD-14 · Estado loading não controlado em `toggleStatus` e `remove`

**Arquivos:** `admin/links/page.tsx`, `admin/schedules/page.tsx`, `admin/notes/page.tsx`
**Impacto:** O usuário pode clicar no toggle ou no botão de remover múltiplas vezes enquanto a operação está em andamento.

**Ação:** Adicionar estado de loading local por item ou desabilitar a interação durante operações pendentes.

---

#### TD-15 · Sem proteção de rota no frontend

**Arquivos:** Não existe middleware de rota em `middleware.ts`
**Impacto (hipótese — avaliar):** Um usuário com role USER que acessa diretamente `/admin/permissions` ou `/admin/users` recebe erro do backend (401/403), mas o frontend não faz redirect proativo para `/` ou `/login`.

**Ação:** Avaliar se é necessário criar um `middleware.ts` no Next.js ou um HOC de proteção de rota. O backend já retorna 403, mas a experiência do usuário seria melhor com um redirect imediato.

---

### CATEGORIA 5 — Ausências estruturais

---

#### TD-16 · Nenhum teste automatizado

**Impacto:** Refatorações não têm safety net. A duplicação do código (TD-04, TD-05) significa que um bug pode existir em um arquivo mas não em outro — e sem testes, isso só é descoberto em produção.

**Recomendação:** Não bloqueia a refatoração, mas deve entrar no roadmap. Começar com:
1. Testes unitários das funções utilitárias (`lib/image.ts`, `lib/error.ts`) — mais fáceis
2. Testes de integração dos hooks (`useFavorites`, `useWebSocket`)
3. Testes E2E dos fluxos críticos (login, criar link, favoritar)

**Ferramentas sugeridas:** Vitest para unitários, Playwright para E2E.

---

#### TD-17 · Sem error boundaries

**Impacto:** Um erro de runtime em qualquer componente derruba a página inteira sem mensagem útil para o usuário.

**Ação:** Adicionar `error.tsx` nos route groups `(app)` e `(auth)` do App Router — o Next.js suporta isso nativamente.

---

## Resumo de prioridades

### Fazer antes de qualquer refatoração de página

| # | Item | Esforço |
|---|---|---|
| TD-01 | Remover `console.log` do store | 5 min |
| TD-02 | Corrigir classe `surface` no backup | 5 min |
| TD-03 | Corrigir acentuação nas strings de UI | 15 min |
| TD-04 | Centralizar funções utilitárias em `lib/` | 1h |

### Fazer junto com a refatoração dos CRUDs

| # | Item | Esforço |
|---|---|---|
| TD-05 | Eliminar duplicação dos 3 CRUDs | Alto |
| TD-06 | Corrigir padrão `load()` + useEffect | Médio |
| TD-07 | Substituir `window.confirm` por modal | Médio |
| TD-08 | Adicionar try/catch em toggleStatus/remove | Baixo |
| TD-09 | Remover `any` do useFavorites | Baixo |
| TD-10 | Unificar `EntityType` | Baixo |
| TD-13 | Adicionar validação por campo nos forms | Médio |

### Fazer após estabilização

| # | Item | Esforço |
|---|---|---|
| TD-11 | ID dinâmico no AdminModal | Baixo |
| TD-12 | Mover `navCollapsed` para ui-store | Médio |
| TD-14 | Loading por item no toggle/remove | Médio |
| TD-15 | Proteção de rota no frontend | Médio |
| TD-16 | Testes automatizados | Alto |
| TD-17 | Error boundaries com error.tsx | Baixo |
