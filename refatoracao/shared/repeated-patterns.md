# Padrões Repetidos e Duplicações — Facilita V2 Frontend

> Escopo: `v2/frontend/src/`
> Atualizado em: 2026-04-01

Este documento cataloga todas as duplicações de código identificadas no projeto, com localização exata, nível de impacto e recomendação de extração. Use este documento como referência durante a refatoração para garantir que nenhuma duplicação seja tratada em isolamento.

---

## Índice de duplicações

| # | Duplicação | Ocorrências | Impacto | Prioridade |
|---|---|---|---|---|
| D1 | `normalizeImagePosition()` | 4 arquivos | Alto | **Crítica** |
| D2 | `resolveFileUrl()` / `resolveImageUrl()` | 4 arquivos | Alto | **Crítica** |
| D3 | `getErrorMessage()` | 5 arquivos | Alto | **Crítica** |
| D4 | Estrutura de estado CRUD | 3 páginas | Alto | **Crítica** |
| D5 | Função `load()` (fetch + setState) | 3 páginas | Alto | **Crítica** |
| D6 | `openCreate()` / `openEdit()` / `save()` | 3 páginas | Alto | **Crítica** |
| D7 | `toggleStatus()` / `remove()` | 3 páginas | Alto | **Crítica** |
| D8 | `imagePosition` useMemo (parser de string) | 3 páginas | Médio | Alta |
| D9 | JSX do card de conteúdo | 4 arquivos | Alto | **Crítica** |
| D10 | Modal form com tabs BASIC/CATEGORY/VISUAL | 3 páginas | Alto | **Crítica** |
| D11 | Visual tab com ImageSelector + sliders + preview | 3 páginas | Alto | **Crítica** |
| D12 | Estados loading/error/empty inline | 4+ arquivos | Médio | Alta |
| D13 | Header de página com título + filtro + botão | 3 páginas | Médio | Alta |
| D14 | `console.log` de debug em produção | 1 arquivo | Baixo | **Imediata** |
| D15 | Tipo `EntityType` declarado em dois lugares | 2 arquivos | Baixo | Média |
| D16 | `any` types no hook de favoritos | 1 arquivo | Médio | Média |
| D17 | `window.confirm` para deleção | 3 páginas | Médio | Alta |
| D18 | Acentuação ausente em strings de UI | Múltiplos | Baixo | **Imediata** |
| D19 | Classe `surface` fora do design system | 1 página | Baixo | **Imediata** |

---

## Detalhamento por duplicação

---

### D1 — `normalizeImagePosition()`

**Descrição:** Função que transforma uma string de posição (`"50 50"`, `"50%"`, null) em formato CSS válido `"50% 50%"`.

**Ocorrências:**

| Arquivo | Linhas |
|---|---|
| `app/(app)/page.tsx` | 38–43 |
| `app/(app)/admin/links/page.tsx` | 27–32 |
| `app/(app)/admin/schedules/page.tsx` | 27–32 |
| `app/(app)/admin/notes/page.tsx` | 25–30 |

**Código duplicado (idêntico nos 4 arquivos):**
```typescript
function normalizeImagePosition(position?: string | null) {
  if (!position) return '50% 50%';
  const [x = '50%', y = '50%'] = position.trim().split(/\s+/);
  const format = (value: string) => (value.includes('%') ? value : `${value}%`);
  return `${format(x)} ${format(y)}`;
}
```

**Destino sugerido:** `lib/image.ts` → `export function normalizeImagePosition(position?: string | null): string`

---

### D2 — `resolveFileUrl()` / `resolveImageUrl()`

**Descrição:** Função que resolve um caminho relativo em URL absoluta usando `serverURL`. Tem **dois nomes diferentes** entre os arquivos, mas implementação idêntica.

**Ocorrências:**

| Arquivo | Nome local | Linhas |
|---|---|---|
| `app/(app)/page.tsx` | `resolveFileUrl` | 45–48 |
| `app/(app)/admin/links/page.tsx` | `resolveImageUrl` | 34–37 |
| `app/(app)/admin/schedules/page.tsx` | `resolveFileUrl` | 34–37 |
| `app/(app)/admin/notes/page.tsx` | `resolveFileUrl` | 32–35 |

**Código duplicado (idêntico nos 4 arquivos):**
```typescript
function resolveFileUrl(path?: string | null) {
  if (!path) return '';
  return path.startsWith('http') ? path : `${serverURL}${path}`;
}
```

**Nota:** A home (`page.tsx`) usa `resolveFileUrl` para links, documentos e notas. `admin/links` chama a mesma função de `resolveImageUrl`. O nome diferente é um bug silencioso — ambas fazem exatamente o mesmo.

**Destino sugerido:** `lib/image.ts` → `export function resolveAssetUrl(path?: string | null): string`

---

### D3 — `getErrorMessage()`

**Descrição:** Extrai a mensagem de erro de uma resposta de API aninhada, com fallback.

**Ocorrências:**

| Arquivo | Linhas |
|---|---|
| `app/(app)/page.tsx` | 50–54 |
| `app/(app)/admin/links/page.tsx` | 39–43 |
| `app/(app)/admin/schedules/page.tsx` | 39–43 |
| `app/(app)/admin/notes/page.tsx` | 37–41 |
| `app/(app)/admin/backup/page.tsx` | 15–19 |

**Código duplicado (idêntico nos 5 arquivos):**
```typescript
function getErrorMessage(error: unknown, fallback: string) {
  const payload = error as { response?: { data?: { message?: unknown } } };
  const message = payload.response?.data?.message;
  return typeof message === 'string' ? message : fallback;
}
```

**Nota:** Esta função já existe de forma similar em `lib/api.ts` como `parseErrorMessage`, mas sem o parâmetro `fallback`. As duas implementações poderiam ser unificadas.

**Destino sugerido:** `lib/error.ts` → `export function getApiErrorMessage(error: unknown, fallback: string): string`

---

### D4 — Estrutura de estado CRUD

**Descrição:** Os três CRUDs de conteúdo (Links, Documentos, Notas) declaram exatamente os mesmos estados na mesma ordem.

**Ocorrências:** `admin/links/page.tsx`, `admin/schedules/page.tsx`, `admin/notes/page.tsx`

**Código duplicado:**
```typescript
const [items, setItems] = useState<T[]>([]);
const [categories, setCategories] = useState<Category[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const globalSearch = useUiStore((state) => state.globalSearch);
const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
const [modalOpen, setModalOpen] = useState(false);
const [editing, setEditing] = useState<T | null>(null);
const [form, setForm] = useState({ ...emptyForm });
const [formTab, setFormTab] = useState<FormTab>('BASIC');
const [saving, setSaving] = useState(false);
const isSuperadmin = user?.role === 'SUPERADMIN';
```

**Destino sugerido:** Hook `useContentCrud<T>` ou store temporário por entidade.

---

### D5 — Função `load()` (fetch + setState)

**Descrição:** Cada CRUD tem uma função `load()` que busca a lista de itens + categorias e popula o estado. A estrutura é idêntica; apenas o endpoint muda.

**Ocorrências:** `admin/links/page.tsx` (64–88), `admin/schedules/page.tsx` (65–89), `admin/notes/page.tsx` (64–86)

**Padrão duplicado:**
```typescript
const load = async () => {
  setLoading(true);
  setError(null);
  try {
    const [itemsRes, categoriesRes] = await Promise.all([
      api.get(isSuperadmin ? `/${entity}/admin/list` : `/${entity}`, {
        params: { includeInactive: true },
      }),
      api.get('/categories', { params: { includeInactive: true } }),
    ]);
    const raw = Array.isArray(itemsRes.data) ? itemsRes.data : [];
    const scoped = isSuperadmin ? raw : raw.filter((item: T) => item.ownerId === user?.id);
    setItems(scoped);
    setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
  } catch (err: unknown) {
    setError(getErrorMessage(err, 'Não foi possível carregar...'));
  } finally {
    setLoading(false);
  }
};
useEffect(() => { void load(); }, [isSuperadmin, user?.id]);
```

**Problema adicional:** `load` não está no array de dependências do `useEffect` (violação da regra de hooks). Funciona por acidente porque `load` é recriada toda vez que o componente re-renderiza e o effect depende de `isSuperadmin` e `user?.id`, que são os verdadeiros gatilhos. A solução correta é `useCallback` + incluir `load` nas dependências.

---

### D6 — `openCreate()`, `openEdit()`, `save()`

**Descrição:** As funções de abrir modal de criação, abrir modal de edição e salvar são estruturalmente idênticas entre os três CRUDs.

**Ocorrências:** `admin/links/page.tsx`, `admin/schedules/page.tsx`, `admin/notes/page.tsx`

**Padrão `openCreate()` (idêntico):**
```typescript
const openCreate = () => {
  setEditing(null);
  setForm({ ...emptyForm, visibility: 'PRIVATE' });
  setFormTab('BASIC');
  setModalOpen(true);
};
```

**Padrão `openEdit()` (mesma estrutura, campos diferentes):**
```typescript
const openEdit = (item: T) => {
  setEditing(item);
  setForm({ /* campos do item */ });
  setFormTab('BASIC');
  setModalOpen(true);
};
```

**Padrão `save()` (idêntico em estrutura):**
```typescript
const save = async () => {
  if (/* validação */) return;
  setSaving(true);
  try {
    const payload = { /* campos */ };
    if (editing) {
      await api.patch(`/${entity}/${editing.id}`, payload);
    } else {
      await api.post(`/${entity}`, payload);
    }
    setModalOpen(false);
    await load();
  } finally {
    setSaving(false);
  }
};
```

---

### D7 — `toggleStatus()` e `remove()`

**Descrição:** Toggle de status e remoção são idênticos nos três CRUDs.

**Ocorrências:** `admin/links/page.tsx`, `admin/schedules/page.tsx`, `admin/notes/page.tsx`

**Padrão `toggleStatus()`:**
```typescript
const toggleStatus = async (item: T) => {
  await api.patch(`/${entity}/${item.id}`, {
    status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
  });
  await load();
};
```

**Padrão `remove()`:**
```typescript
const remove = async (item: T) => {
  if (!window.confirm(`Remover ${entityLabel} ${item.title}?`)) return;
  await api.delete(`/${entity}/${item.id}`);
  await load();
};
```

**Problema adicional:** `toggleStatus` e `remove` não têm `try/catch`. Erros são capturados apenas pelo interceptor do `api.ts` (que emite toast), mas o estado de loading não é gerenciado — se a chamada falhar, o usuário não recebe feedback visual de que a operação falhou além do toast.

---

### D8 — `imagePosition` useMemo (parser de string)

**Descrição:** Cada CRUD tem um `useMemo` que parseia a string `form.imagePosition` em `{ x: number, y: number }` para os sliders.

**Ocorrências:** `admin/links/page.tsx` (106–117), `admin/schedules/page.tsx` (107–118), `admin/notes/page.tsx` (104–115)

**Código duplicado (idêntico):**
```typescript
const imagePosition = useMemo(() => {
  const [xRaw = '50%', yRaw = '50%'] = form.imagePosition.split(' ');
  const parse = (value: string) => {
    const numeric = Number.parseInt(value, 10);
    if (Number.isNaN(numeric)) return 50;
    return Math.max(0, Math.min(100, numeric));
  };
  return { x: parse(xRaw), y: parse(yRaw) };
}, [form.imagePosition]);
```

**Destino sugerido:** `lib/image.ts` → `export function parseImagePosition(position: string): { x: number; y: number }`

---

### D9 — JSX do card de conteúdo

**Descrição:** O card visual de um item (imagem de capa, badge de categoria, nome, badge de tipo, toggle de status) é renderizado de forma quasi-idêntica em quatro lugares.

**Ocorrências:**

| Arquivo | Contexto |
|---|---|
| `app/(app)/page.tsx` | Cards do portal (modo leitura) |
| `app/(app)/admin/links/page.tsx` | Cards admin (com botão de editar) |
| `app/(app)/admin/schedules/page.tsx` | Cards admin |
| `app/(app)/admin/notes/page.tsx` | Cards admin |

**Variações por arquivo:**
- Home: card clicável (abre link/documento/nota), tem `FavoriteButton` e status badge
- Admin: card é `<button>` para abrir o modal de edição, tem toggle de status no rodapé

**Destino sugerido:** `<ContentCard>` com prop `mode: 'view' | 'edit'` ou dois componentes (`<PortalCard>` e `<AdminCard>`) compartilhando os sub-elementos visuais.

---

### D10 — Modal form com tabs BASIC/CATEGORY/VISUAL

**Descrição:** Os três CRUDs têm um `<AdminModal>` com exatamente a mesma estrutura de tabs.

**Ocorrências:** `admin/links/page.tsx`, `admin/schedules/page.tsx`, `admin/notes/page.tsx`

**JSX duplicado:**
```tsx
<div className="fac-tabs">
  <button type="button" className="fac-tab" data-active={formTab === 'BASIC' ? 'true' : 'false'} onClick={() => setFormTab('BASIC')}>
    Basico
  </button>
  <button type="button" className="fac-tab" data-active={formTab === 'CATEGORY' ? 'true' : 'false'} onClick={() => setFormTab('CATEGORY')}>
    Categorizacao
  </button>
  <button type="button" className="fac-tab" data-active={formTab === 'VISUAL' ? 'true' : 'false'} onClick={() => setFormTab('VISUAL')}>
    Visual
  </button>
</div>
```

**Destino sugerido:** `<FormTabs value={formTab} onChange={setFormTab} />` ou `<ContentFormModal>` que encapsula a estrutura inteira.

---

### D11 — Visual tab com ImageSelector + sliders + preview

**Descrição:** A aba "Visual" do formulário (seletor de imagem, sliders de posição X/Y/zoom, preview do card) é quase idêntica nos três CRUDs. A única diferença é o label do tipo no preview ("LINK", "DOC", "NOTA").

**Ocorrências:** `admin/links/page.tsx` (456–558), `admin/schedules/page.tsx` (465–567), `admin/notes/page.tsx` (425–542)

**Código duplicado estimado:** ~100 linhas por arquivo = **~300 linhas duplicadas**.

**Destino sugerido:** `<VisualFormSection imageUrl={...} imagePosition={...} imageScale={...} onImageChange={...} onPositionChange={...} onScaleChange={...} previewLabel="LINK" />` ou usar `<ImageControls>`.

---

### D12 — Estados loading/error/empty inline

**Descrição:** O padrão de renderização condicional de estados de carregamento, erro e vazio é repetido com variações mínimas.

**Ocorrências:** home, links admin, schedules admin, notes admin (e provavelmente outras páginas)

**Padrão duplicado:**
```tsx
{loading ? (
  <p className="text-[14px] text-muted-foreground">Carregando...</p>
) : error ? (
  <p className="text-[14px] text-red-700">{error}</p>
) : items.length === 0 ? (
  <p className="text-[14px] text-muted-foreground">Nenhum item encontrado.</p>
) : (
  /* conteúdo */
)}
```

**Nota:** O CSS já define `fac-empty-state`, `fac-loading-state` e `fac-error-state` mas não são usados consistentemente nos estados inline das páginas admin. A home usa as classes CSS, mas as páginas admin usam `<p>` simples.

**Destino sugerido:** Componentes `<LoadingState message="">`, `<ErrorState message="">`, `<EmptyState message="">` que usam as classes CSS corretas, ou composição de um `<ContentState loading={} error={} empty={}>`.

---

### D13 — Header de página com título + filtro + botão

**Descrição:** Todas as páginas admin têm o mesmo padrão de header.

**Ocorrências:** `admin/links`, `admin/schedules`, `admin/notes`

**JSX duplicado:**
```tsx
<section className="fac-page-head">
  <div>
    <h1 className="fac-subtitle">{título}</h1>
    <p className="text-[15px] text-muted-foreground">{descrição}</p>
  </div>
  <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-[190px_auto_auto]">
    <select className="fac-select">...</select>
    <button className="fac-filter-button">Filtros</button>
    <button className="fac-button-primary" onClick={openCreate}>Novo {tipo}</button>
  </div>
</section>
```

**Destino sugerido:** `<PageHeader title="" description="" actions={} />` ou apenas convenção documentada.

---

### D14 — `console.log` de debug em produção

**Arquivo:** `stores/realtime-notification-store.ts` (linhas 57–65)

**Código a remover:**
```typescript
addNotification: (notification) =>
  set((state) => {
    console.log('[Store] Adding notification:', notification);       // remover
    console.log('[Store] Current notifications count:', state.notifications.length); // remover
    console.log('[Store] Current unreadCount:', state.unreadCount);  // remover
    const newState = { ... };
    console.log('[Store] New unreadCount:', newState.unreadCount);    // remover
    console.log('[Store] New notifications count:', newState.notifications.length);  // remover
    return newState;
  }),
```

**Prioridade:** Imediata. Quick win de 5 linhas.

---

### D15 — Tipo `EntityType` declarado em dois lugares

**Descrição:** O tipo `EntityType` é declarado em dois arquivos diferentes com valores ligeiramente diferentes.

**Ocorrências:**

| Arquivo | Valores |
|---|---|
| `types/index.ts` | `'LINK' \| 'SCHEDULE' \| 'NOTE' \| 'USER'` |
| `hooks/useFavorites.tsx` | `'LINK' \| 'SCHEDULE' \| 'NOTE'` |
| `stores/realtime-notification-store.ts` | `'LINK' \| 'SCHEDULE' \| 'NOTE'` |

**Recomendação:** Exportar o tipo de `types/index.ts` e importar nos outros arquivos.

---

### D16 — `any` types no hook de favoritos

**Arquivo:** `hooks/useFavorites.tsx`

**Ocorrências:**
```typescript
link?: any;     // linha 26
schedule?: any; // linha 27
note?: any;     // linha 28
// e em error handlers:
} catch (error: any) { // linhas 93, 128, 168, etc.
```

**Recomendação:** Substituir pelos tipos de `types/index.ts` (`Link`, `UploadedSchedule`, `Note`) e usar `unknown` em catch.

---

### D17 — `window.confirm` para deleção

**Descrição:** Todas as funções `remove()` dos CRUDs usam `window.confirm()` como modal de confirmação.

**Ocorrências:** `admin/links/page.tsx` (187–190), `admin/schedules/page.tsx` (208–211), `admin/notes/page.tsx` (181–184)

**Problemas:**
- Não segue o design system
- Inacessível (foco não gerenciado, sem ARIA)
- Bloqueia o event loop
- Não customizável

**Destino sugerido:** `<ConfirmModal>` usando `AdminModal` existente.

---

### D18 — Acentuação ausente em strings de UI

**Arquivos afetados:** `app-nav.tsx` (labels da sidebar), `admin/links/page.tsx`, `admin/schedules/page.tsx`, `admin/notes/page.tsx` (tabs do form)

**Strings incorretas:**

| Local | String atual | Correto |
|---|---|---|
| `app-nav.tsx` | `'Navegacao'` | `'Navegação'` |
| `app-nav.tsx` | `'Cadastros'` | — (correto) |
| `app-nav.tsx` | `'Usuarios'` | `'Usuários'` |
| `app-nav.tsx` | `'Permissoes'` | `'Permissões'` |
| `app-nav.tsx` | `'Configuracoes'` | `'Configurações'` |
| `app-nav.tsx` | `'Restauracao'` | `'Restauração'` |
| Form tabs | `'Basico'` | `'Básico'` |
| Form tabs | `'Categorizacao'` | `'Categorização'` |
| `user-nav-menu.tsx` | `'Notificacoes'` | `'Notificações'` |

**Prioridade:** Imediata. Quick win visual, baixo risco.

---

### D19 — Classe `surface` fora do design system

**Arquivo:** `app/(app)/admin/backup/page.tsx` (linha 106)

```tsx
<section className="surface animate-in fade-in slide-in-from-bottom-2 p-3 sm:p-4">
```

A classe `surface` não está definida em `globals.css` nem no Tailwind. O componente deveria usar `fac-panel` ou similar.

**Prioridade:** Imediata. Quick win de 1 linha.

---

## Mapa de dependências para extração

```
lib/error.ts (getApiErrorMessage)
    ← home/page.tsx
    ← admin/links/page.tsx
    ← admin/schedules/page.tsx
    ← admin/notes/page.tsx
    ← admin/backup/page.tsx

lib/image.ts (normalizeImagePosition, resolveAssetUrl, parseImagePosition)
    ← home/page.tsx
    ← admin/links/page.tsx
    ← admin/schedules/page.tsx
    ← admin/notes/page.tsx

<ConfirmModal>
    ← admin/links/page.tsx
    ← admin/schedules/page.tsx
    ← admin/notes/page.tsx

<ContentCard> (ou PortalCard + AdminCard)
    ← home/page.tsx
    ← admin/links/page.tsx
    ← admin/schedules/page.tsx
    ← admin/notes/page.tsx
    ← favoritos/page.tsx (hipótese)

<VisualFormSection>
    ← admin/links/page.tsx (tab VISUAL)
    ← admin/schedules/page.tsx (tab VISUAL)
    ← admin/notes/page.tsx (tab VISUAL)
```
