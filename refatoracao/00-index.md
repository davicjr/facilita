# Inventário do Projeto — Facilita V2

> Gerado em: 2026-04-01
> Escopo: `v2/` (frontend + backend + infra)
> Stack: Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Zustand · NestJS 11 · Prisma 7 · PostgreSQL 16 · Socket.io · Docker

---

## Visão geral do projeto

O Facilita V2 é um portal corporativo interno para centralizar e distribuir links, documentos e notas entre usuários. Possui dois perfis: SUPERADMIN (gestão total) e USER (acesso ao portal). A arquitetura é madura — full-stack TypeScript, App Router, Zustand, design system próprio via CSS utilities (`fac-*`) — mas o código acumulou duplicação estrutural severa especialmente nas páginas administrativas de CRUD.

**Percepção geral:**
- Organização de pastas: boa no front e no back
- Design system: sólido conceitualmente, com algumas inconsistências pontuais
- Escalabilidade: comprometida pelo padrão de duplicação — adicionar um quarto tipo de conteúdo exige replicar ~500 linhas
- Consistência visual: alta — o sistema `fac-*` está sendo respeitado na maioria dos lugares
- Qualidade técnica: boa nas bordas (api.ts, stores, hooks) e fraca no centro (páginas de CRUD)

**Forças:**
- Design system bem definido (`globals.css` com tokens CSS e classes utilitárias `fac-*`)
- API client com interceptors de auth (refresh token) e notificação automática
- Stores Zustand enxutos e com responsabilidades claras
- Backend NestJS bem modularizado com Prisma
- WebSocket integrado com store dedicado
- Soft delete consistente no banco
- Docker Compose funcional com Nginx como proxy

**Fraquezas:**
- Duplicação crítica: 3 páginas de CRUD (Links, Schedules, Notes) são quasi-idênticas
- 4 funções utilitárias copiadas em cada página de CRUD e na home
- Formulários sem biblioteca de validação — sem feedback de erro por campo
- `window.confirm()` para deleções — inacessível
- Nenhum teste automatizado
- `navCollapsed` gerenciado no AppShell com `localStorage` direto, fora do ui-store
- USER vê rotas de `/admin/*` na sidebar (sem proteção de rota explícita visível)
- `load()` sem `useCallback` — dependências implícitas no useEffect
- Classe `surface` usada na página de backup — não existe no design system
- Acentuação ausente em labels e textos (ex: "Categorizacao", "Basico", "Configuracoes")

---

## Mapa de páginas

### Grupo de autenticação `(auth)`

| Página | Rota | Arquivo | Responsabilidade | Complexidade | Prioridade |
|--------|------|---------|-----------------|-------------|-----------|
| Login | `/login` | `app/(auth)/login/page.tsx` | Formulário de login com JWT | Baixa | 4 |
| Register | `/register` | `app/(auth)/register/page.tsx` | Placeholder desabilitado | Mínima | 7 |
| Forgot Password | `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | Placeholder | Mínima | 8 |

### Grupo de aplicação `(app)`

| Página | Rota | Arquivo | Responsabilidade | Complexidade | Prioridade |
|--------|------|---------|-----------------|-------------|-----------|
| Home / Portal | `/` | `app/(app)/page.tsx` | Lista unificada de Links, Docs e Notas com filtros, categorias e busca | Alta | **1** |
| Dashboard | `/dashboard` | `app/(app)/dashboard/page.tsx` | Métricas e analytics | Média | 5 |
| Favoritos | `/favoritos` | `app/(app)/favoritos/page.tsx` | Lista de itens favoritados | Média | 6 |
| Compartilhados | `/compartilhados` | `app/(app)/compartilhados/page.tsx` | Itens compartilhados com o usuário | Média | 6 |
| Admin — Links | `/admin/links` | `app/(app)/admin/links/page.tsx` | CRUD de links | Alta | **2** |
| Admin — Documentos | `/admin/schedules` | `app/(app)/admin/schedules/page.tsx` | CRUD de documentos + upload | Alta | **2** |
| Admin — Notas | `/admin/notes` | `app/(app)/admin/notes/page.tsx` | CRUD de notas | Alta | **2** |
| Admin — Categorias | `/admin/categories` | `app/(app)/admin/categories/page.tsx` | CRUD de categorias | Média | 3 |
| Admin — Imagens | `/admin/images` | `app/(app)/admin/images/page.tsx` | Galeria e gestão de imagens | Média | 3 |
| Admin — Usuários | `/admin/users` | `app/(app)/admin/users/page.tsx` | Gestão de usuários (SUPERADMIN) | Média | 4 |
| Admin — Permissões | `/admin/permissions` | `app/(app)/admin/permissions/page.tsx` | Controle de permissões por role | Média | 4 |
| Admin — Configurações | `/admin/settings` | `app/(app)/admin/settings/page.tsx` | SystemConfig (chave/valor) | Baixa | 5 |
| Admin — Backup | `/admin/backup` | `app/(app)/admin/backup/page.tsx` | Geração granular de backup ZIP | Média | 5 |
| Admin — Restauração | `/admin/restore` | `app/(app)/admin/restore/page.tsx` | Upload e restauração de backup | Média | 5 |
| Admin — Reset | `/admin/reset` | `app/(app)/admin/reset/page.tsx` | Reset seletivo de dados | Alta risco | 5 |

---

## Mapa de funcionalidades

| Funcionalidade | Páginas impactadas | Arquivos principais | Objetivo | Complexidade | Prioridade |
|---|---|---|---|---|---|
| **CRUD de conteúdo (Links/Docs/Notas)** | admin/links, admin/schedules, admin/notes | Três `page.tsx` + modal.tsx + image-selector.tsx | Criar, editar, ativar/desativar e remover conteúdo | Alta | **1** |
| **Portal (Home)** | `/` | `app/(app)/page.tsx` | Exibir e filtrar conteúdo por tipo, categoria e busca | Alta | **1** |
| **Design system `fac-*`** | Todas | `globals.css` | Tokens de design e classes utilitárias reutilizáveis | Média | **2** |
| **Autenticação** | Login, todas (app) | `auth-store.ts`, `api.ts`, `app-shell.tsx` | JWT + refresh token + redirect | Média | 3 |
| **AppShell / Layout** | Todas (app) | `app-shell.tsx`, `app-header.tsx`, `app-nav.tsx` | Layout responsivo com sidebar colapsável | Média | **2** |
| **Menu flutuante do usuário** | Todas (app) | `user-nav-menu.tsx` | Busca, notificações, tema, logout, perfil | Alta | 3 |
| **Sistema de favoritos** | Home, Favoritos | `useFavorites.tsx`, `FavoriteButton.tsx` | Marcar/desmarcar favoritos por tipo de entidade | Média | 4 |
| **Notificações em tempo real** | Todas (app) | `useWebSocket.tsx`, `realtime-notification-store.ts`, `user-nav-menu.tsx` | WebSocket + store + UI de notificações | Média | 4 |
| **Upload de imagens** | Links, Docs, Notas, Imagens | `image-selector.tsx`, `image-gallery.tsx`, `useImageGallery.ts` | Upload e seleção de imagens da galeria | Média | 3 |
| **Backup / Restore** | admin/backup, admin/restore | `backup.ts`, `backup-selection.tsx` | Geração e restauração de backups granulares | Média | 5 |
| **Permissões** | admin/permissions | `app/(app)/admin/permissions/page.tsx` | Edição de permissões por role | Baixa | 5 |
| **Configurações do sistema** | admin/settings | `app/(app)/admin/settings/page.tsx` | CRUD de SystemConfig | Baixa | 6 |
| **Compartilhamento** | Compartilhados, home | `shares/` (backend) | Compartilhar conteúdo entre usuários | Média | 6 |
| **Reset de dados** | admin/reset | `app/(app)/admin/reset/page.tsx` | Limpeza seletiva de dados | Alta risco | 7 |

---

## Problemas transversais encontrados

### 1. Duplicação crítica de código (CRÍTICO)

As páginas `admin/links/page.tsx`, `admin/schedules/page.tsx` e `admin/notes/page.tsx` são quasi-idênticas (~500 linhas cada). Compartilham:

**Funções locais copiadas em todos os três arquivos (e também na home):**
```
normalizeImagePosition()   → duplicada em: home, links, schedules, notes (4×)
resolveFileUrl()           → duplicada em: home, links, schedules, notes (4×)
getErrorMessage()          → duplicada em: home, links, schedules, notes, backup (5×)
```

**Estrutura de estado idêntica:**
```
[items, setItems]           // lista de entidades
[categories, setCategories] // categorias
[loading, setLoading]       // loading
[error, setError]           // erro
[modalOpen, setModalOpen]   // modal
[editing, setEditing]       // item em edição
[form, setForm]             // form state
[formTab, setFormTab]       // tab ativa no form
[saving, setSaving]         // submit loading
```

**Funções de CRUD idênticas em estrutura:**
```
load()         // fetch items + categories
openCreate()   // reset form + abrir modal
openEdit()     // preencher form + abrir modal
save()         // POST ou PATCH + reload
toggleStatus() // PATCH status + reload
remove()       // window.confirm + DELETE + reload
```

**JSX idêntico:**
- Header com título + filtro de status + botão "Novo"
- Panel com tabela/grid de cards
- Cards com imagem, categoria, toggle de status
- Modal com tabs BASIC / CATEGORIA / VISUAL
- Aba VISUAL com ImageSelector + sliders de posição/zoom + preview do card

### 2. `useEffect` sem `useCallback` para `load()`

O padrão usado é:
```typescript
const load = async () => { ... };
useEffect(() => { void load(); }, [isSuperadmin, user?.id]);
```

`load` é declarado dentro do componente mas **não está no array de dependências** do useEffect — o que é correto por acidente, mas viola o modelo de dependências do React e pode esconder bugs. A solução correta é usar `useCallback` ou mover a lógica para dentro do `useEffect`.

### 3. `window.confirm()` para deleções

Todos os admin CRUDs usam `window.confirm()` para confirmar exclusão. Problemas:
- Inacessível (não respeita temas, não tem foco gerenciado)
- Não customizável visualmente
- Bloqueia o event loop

### 4. Formulários sem validação de campo

As validações são apenas:
- Links: `!form.title.trim() || !form.url.trim()`
- Docs: `!form.title.trim() || !form.fileUrl`
- Notas: `!form.title.trim() || !form.content.trim()`

Não há feedback por campo, sem mensagens de erro inline, sem highlight do campo inválido.

### 5. `navCollapsed` gerenciado fora do store

O estado `navCollapsed` é um `useState` local no `AppShell` que lê/escreve diretamente em `localStorage`. Deveria estar no `ui-store` (que já tem persistência via Zustand persist).

### 6. Classe `surface` desconhecida na página de backup

`backup/page.tsx` usa `className="surface animate-in fade-in slide-in-from-bottom-2 p-3 sm:p-4"`. A classe `surface` não existe no design system `fac-*`. Provavelmente é uma classe legada ou esquecida — o componente deveria usar `fac-panel`.

### 7. Acentuação ausente em textos de UI

Labels e labels da sidebar não têm acento:
- "Categorizacao" → "Categorização"
- "Basico" → "Básico"
- "Configuracoes" → "Configurações"
- "Navegacao" → "Navegação"
- "Permissoes" → "Permissões"
- "Usuarios" → "Usuários"
- "Restauracao" → "Restauração"

### 8. USER tem acesso visual a rotas admin

A sidebar do perfil USER exibe links para `/admin/categories`, `/admin/links`, `/admin/schedules`, `/admin/notes`, `/admin/images`. Isso pode ser intencional (usuários gerenciam seu próprio conteúdo), mas não fica claro no código se há proteção de rota do lado do frontend. O backend protege via guards, mas o frontend não tem redirect explícito para não-SUPERADMIN tentando acessar rotas restritas.

### 9. `window.confirm` + ausência de modal de confirmação

Relacionado ao item 3 — o projeto tem um `AdminModal` genérico que poderia ser usado como modal de confirmação de deleção, mas não é.

### 10. Nenhum teste automatizado

Zero arquivos `.spec.ts` ou `.test.ts` em `src/`. Sem Vitest, Jest ou Playwright configurados.

### 11. `resolveFileUrl` vs `resolveImageUrl`

A home usa `resolveFileUrl()`, mas admin/links usa `resolveImageUrl()`. São a mesma função com nomes diferentes — mais uma duplicação silenciosa.

### 12. Título do card de notas no formTab VISUAL

No `admin/notes/page.tsx`, o preview do card tem um botão "Ver" que abre um segundo `AdminModal` para preview da nota. Esse comportamento é único nessa página (links e docs não têm isso) — e a lógica de montar um `Note` fake (`id: 'preview'`) para preencher o modal é frágil.

### 13. Acoplamento entre AppShell e UserNavMenu

O `AppShell` gerencia `mobileMenuOpen` e `profileOpen` e passa callbacks para o `UserNavMenu`, que por sua vez altera esses estados. O `UserNavMenu` também acessa `navCollapsed` do AppShell via prop. Há um acoplamento bidirecional que dificulta a manutenção.

---

## Oportunidades de melhoria global

### Componentes a extrair

| Componente | Onde usar | Benefício |
|---|---|---|
| `<ContentCrudPage>` ou hook `useContentCrud` | Links, Docs, Notas | Elimina 1.500 linhas de duplicação |
| `<ContentCard>` | Home, Links, Docs, Notas, Favoritos | Card visual unificado |
| `<ConfirmModal>` | Todos os deletes | Substitui `window.confirm` |
| `<ImageControls>` | Visual tab nos 3 CRUDs | Sliders de posição/zoom + preview |
| `<StatusFilter>` | Links, Docs, Notas | Select de status + filtros |
| `<FormField>` | Todos os formulários | Label + input + erro inline |
| `<PageHeader>` | Todos os admins | Título + descrição + ações |
| `<EmptyState>` / `<LoadingState>` / `<ErrorState>` | Todas as páginas | Já existem como `fac-empty-state` etc no CSS, mas não como componentes |

### Utilitários a centralizar

| Utilitário | Arquivo sugerido | Benefício |
|---|---|---|
| `normalizeImagePosition()` | `lib/image.ts` | Elimina 4 cópias |
| `resolveFileUrl()` | `lib/image.ts` ou `lib/url.ts` | Elimina 4 cópias, unifica nome |
| `getErrorMessage()` | `lib/error.ts` | Elimina 5 cópias |
| `imagePositionParser` (useMemo) | `lib/image.ts` | Lógica repetida em 3 páginas |

### Hooks a extrair

| Hook | Onde usar | Benefício |
|---|---|---|
| `useContentList(endpoint, filters)` | Links, Docs, Notas, Home | Encapsula fetch + loading + error + filtros |
| `useContentForm(emptyForm, schema)` | Links, Docs, Notas | Encapsula form state + validação + save/remove |
| `useImagePosition(initialPosition)` | Visual tabs dos 3 CRUDs | Encapsula parsing + update de posição |

### Stores a ajustar

| Ajuste | Benefício |
|---|---|
| Mover `navCollapsed` para `ui-store` | Elimina acesso direto a localStorage no AppShell |

---

## Estratégia sugerida de revisão

### Critérios de prioridade

1. **Impacto de duplicação** — quanto código duplicado é eliminado
2. **Frequência de uso** — páginas mais acessadas pelos usuários
3. **Risco de regressão** — quão isolada é a mudança
4. **Quick wins** — mudanças pequenas com alto impacto visual ou de manutenção

### Ordem recomendada

#### Fase A — Fundação (antes de tocar nas páginas)

| # | Item | Tipo | Motivo |
|---|---|---|---|
| A1 | Utilitários centralizados (`lib/image.ts`, `lib/error.ts`) | feature | Base para eliminar duplicações |
| A2 | Design system — corrigir acentuação e classe `surface` | shared | Quick win, baixo risco |
| A3 | Mover `navCollapsed` para `ui-store` | feature | Base para simplificar AppShell |

#### Fase B — Componentização do CRUD (maior impacto)

| # | Item | Tipo | Motivo |
|---|---|---|---|
| B1 | `<ConfirmModal>` | feature | Substitui `window.confirm` em todos os admins |
| B2 | Página Admin — Links | pages | Mais simples dos 3, serve de modelo |
| B3 | Página Admin — Documentos | pages | Aplica padrão estabelecido em B2 |
| B4 | Página Admin — Notas | pages | Aplica padrão + resolve o preview frágil |

#### Fase C — Home e layout

| # | Item | Tipo | Motivo |
|---|---|---|---|
| C1 | Home / Portal | pages | Alta frequência, oportunidade de `<ContentCard>` |
| C2 | AppShell + AppHeader + AppNav | shared | Depois de `navCollapsed` estar no store |
| C3 | UserNavMenu | feature | Componente grande com múltiplas responsabilidades |

#### Fase D — Páginas secundárias e backend

| # | Item | Tipo | Motivo |
|---|---|---|---|
| D1 | Dashboard | pages | Analytics ainda em dev |
| D2 | Favoritos / Compartilhados | pages | Dependem de `<ContentCard>` resolvido |
| D3 | Admin — Backup / Restore / Reset | pages | Funcionalidades críticas mas raramente usadas |
| D4 | Admin — Permissões / Configurações / Usuários | pages | Uso restrito a SUPERADMIN |

### Quick wins (alto impacto, baixo esforço)

1. Centralizar `normalizeImagePosition`, `resolveFileUrl`, `getErrorMessage` em `lib/`
2. Corrigir acentuação nas strings de UI
3. Substituir classe `surface` por `fac-panel` no backup
4. Mover `navCollapsed` para `ui-store`

### Itens de maior risco

- **Refatoração dos 3 CRUDs** — alto impacto se introduzir regressão
- **`load()` sem useCallback** — cuidado ao reescrever para não criar loop de re-fetch
- **Página de Reset** — operação destrutiva, qualquer mudança exige atenção

### Dependências entre refatorações

```
lib/image.ts, lib/error.ts
    ↓
Admin Links (modelo)
    ↓
Admin Schedules, Admin Notes (aplicam padrão)
    ↓
Home (usa <ContentCard> extraído)
    ↓
Favoritos, Compartilhados
```

---

## Próximos passos sugeridos

**Próximo item: `shared/technical-debt.md` + análise da página Admin — Links**

**Por quê Links primeiro:**
- É o CRUD mais simples dos três (sem upload de arquivo)
- Serve de modelo para Schedules e Notes
- Ao refatorar Links, os padrões extraídos (utilitários, componentes, hooks) já ficam prontos para os outros dois
- É uma das páginas mais usadas no sistema

**Antes de refatorar Links, recomendo criar:**
- `shared/architecture.md` — decisões de arquitetura que valem para todo o projeto
- `shared/repeated-patterns.md` — catálogo das duplicações com localização exata
- `shared/technical-debt.md` — dívidas técnicas priorizadas

Esses documentos garantem que a refatoração de Links não seja feita no vácuo.

---

## Status da execução

- [x] `lib/image.ts` e `lib/error.ts` criados e aplicados nas páginas principais do portal/admin
- [x] `<ConfirmModal>` criado e aplicado em `admin/links`, `admin/schedules`, `admin/notes`, `admin/reset` e `admin/images`
- [x] CRUDs principais (`links`, `schedules`, `notes`) alinhados com `useCallback`, validação inline, toggle acessível e estados `fac-*`
- [x] `admin/categories` e `admin/users` alinhados com o mesmo padrão de CRUD
- [x] `admin/permissions`, `admin/backup`, `admin/restore` e `admin/settings` migrados para `getApiErrorMessage`
- [x] Quick wins de texto/acentuação aplicados em navegação, galerias, compartilhamento e páginas admin secundárias
- [x] Capa/preview extraídos para componentes compartilhados nos CRUDs principais e no portal
- [x] `load`, `toggleStatus` e `remove` extraídos para hook compartilhado nos CRUDs principais
- [x] Home/Portal alinhada com `lib/color.ts`, card acessível, estados `fac-*` e badge condicional
- [x] Dashboard alinhado com textos corrigidos, guard de SUPERADMIN no render e visibilidade derivada em `stats`
- [x] Login alinhado com acentuação, `autoComplete` e link de volta mantido para a home pública
- [x] Compartilhados alinhada com `ShareCard` local, card acessível, overlay externo e estados `fac-*`
- [x] Categorias e galeria de imagens finalizadas com acentuação e `formatBytes` compartilhado
- [x] Usuários, permissões e configurações finalizados com guards `fac-*` e `formatBytes` compartilhado
- [x] Mover `navCollapsed` para `ui-store`
- [ ] Validar manualmente no navegador os fluxos de toggle, confirmação de deleção e re-fetch em caso de erro
- [x] Substituir os `<img>` restantes por `<Image />` ou componente equivalente
