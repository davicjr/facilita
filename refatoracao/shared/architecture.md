# Arquitetura — Facilita V2 Frontend

> Escopo: `v2/frontend/`
> Atualizado em: 2026-04-01

---

## Stack e versões

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.1 |
| Runtime | React | 19.2.3 |
| Linguagem | TypeScript | — |
| Estilização | Tailwind CSS 4 + CSS Variables | ^4 |
| Estado global | Zustand | ^5.0.9 |
| HTTP | Axios | ^1.13.2 |
| WebSocket | Socket.io-client | ^4.8.3 |
| Ícones | Lucide React | ^0.562.0 |
| Utilitários de CSS | clsx + tailwind-merge | — |

---

## Estrutura de pastas

```
src/
├── app/
│   ├── layout.tsx              # Root layout — providers globais
│   ├── globals.css             # Design system (tokens + classes fac-*)
│   ├── (auth)/                 # Route group — sem AppShell
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── forgot-password/page.tsx
│   └── (app)/                  # Route group — com AppShell
│       ├── layout.tsx
│       ├── page.tsx            # Home / Portal
│       ├── dashboard/page.tsx
│       ├── favoritos/page.tsx
│       ├── compartilhados/page.tsx
│       └── admin/
│           ├── links/page.tsx
│           ├── schedules/page.tsx
│           ├── notes/page.tsx
│           ├── categories/page.tsx
│           ├── images/page.tsx
│           ├── users/page.tsx
│           ├── permissions/page.tsx
│           ├── settings/page.tsx
│           ├── backup/page.tsx
│           ├── restore/page.tsx
│           └── reset/page.tsx
├── components/
│   ├── admin/                  # Componentes exclusivos de páginas admin
│   │   ├── modal.tsx
│   │   ├── image-selector.tsx
│   │   ├── image-gallery.tsx
│   │   ├── backup-selection.tsx
│   │   ├── filter-dropdown.tsx
│   │   ├── pager.tsx
│   │   ├── field.tsx
│   │   ├── share-content-modal.tsx
│   │   └── status-badge.tsx
│   ├── ui/                     # Primitivos de UI
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── badge.tsx
│   ├── app-shell.tsx           # Layout raiz autenticado
│   ├── app-header.tsx          # Topbar
│   ├── app-nav.tsx             # Sidebar
│   ├── user-nav-menu.tsx       # Menu flutuante do usuário
│   ├── user-profile-modal.tsx  # Modal de edição de perfil
│   ├── user-avatar.tsx         # Avatar do usuário
│   ├── FavoriteButton.tsx      # Botão de favoritar
│   ├── FavoritesSection.tsx    # Seção de favoritos
│   ├── notification-stack.tsx  # Toast stack
│   ├── notification-bell.tsx   # Sino de notificações
│   ├── contact-modal.tsx       # Modal de contato
│   ├── theme-sync.tsx          # Sincronização de tema no mount
│   ├── websocket-provider.tsx  # Provider do WebSocket
│   └── max-width.tsx           # Wrapper de largura máxima
├── hooks/
│   ├── useFavorites.tsx        # Context + Hook de favoritos
│   ├── useWebSocket.tsx        # Inicialização e eventos do socket
│   ├── useImageGallery.ts      # Galeria de imagens
│   ├── useContentUpdate.ts     # Atualização de conteúdo
│   └── use-notify-on-change.ts # Toast ao mudar valor
├── stores/
│   ├── auth-store.ts           # Autenticação (user + accessToken)
│   ├── ui-store.ts             # UI (theme + globalSearch + sidebarOpen)
│   ├── notification-store.ts   # Toasts de feedback (success/error/info)
│   └── realtime-notification-store.ts  # Notificações em tempo real
├── lib/
│   ├── api.ts                  # Axios instance + interceptors
│   ├── socket.ts               # Socket.io client
│   ├── notify.ts               # Helper para emitir toasts
│   ├── format.ts               # Formatadores (bytes, etc.)
│   ├── utils.ts                # cn() e utilitários gerais
│   └── backup.ts               # Utilitários de seleção de backup
└── types/
    ├── index.ts                # Tipos de domínio (User, Link, Note, etc.)
    └── axios.d.ts              # Extensão de tipos do Axios
```

---

## Padrões arquiteturais em uso

### 1. Route Groups — separação sem URL

O App Router do Next.js usa route groups `(auth)` e `(app)` para separar o layout de páginas autenticadas das páginas de autenticação, sem impactar a URL. Cada grupo tem seu próprio `layout.tsx`.

- `(auth)/layout.tsx` — layout mínimo sem AppShell
- `(app)/layout.tsx` — envolve com `WebSocketProvider` + `AppShell`

**Avaliação:** Correto e limpo.

### 2. Design system via CSS utilities (`fac-*`)

Em vez de um framework de componentes externo (shadcn, MUI, etc.), o projeto usa classes utilitárias próprias definidas em `globals.css` com `@layer utilities`. As classes seguem o prefixo `fac-` e cobrem:

- Layout: `fac-page`, `fac-page-head`, `fac-shell`, `fac-main-grid`, `fac-outlet`
- Navegação: `fac-nav-panel`, `fac-nav-item`, `fac-nav-group`
- Tipografia: `fac-title`, `fac-subtitle`, `fac-kicker`, `fac-label`
- Formulários: `fac-input`, `fac-select`, `fac-textarea`, `fac-toggle`
- Botões: `fac-button-primary`, `fac-button-secondary`, `fac-button-ghost`
- Navegação por categorias: `fac-pill`
- Cards: `fac-card`, `fac-card-cover`, `fac-card-content`
- Painéis: `fac-panel`, `fac-panel-head`, `fac-panel-body`
- Modais: `fac-modal-root`, `fac-modal-panel`, `fac-modal-head`
- Estados: `fac-empty-state`, `fac-loading-state`, `fac-error-state`
- Floats: `fac-floating-user-menu`, `fac-floating-user-panel`

**Avaliação:** Decisão sólida. Evita dependência pesada e mantém o design consistente. As classes são coesas e bem nomeadas. O problema é que algumas partes do código não usam essas classes e escrevem Tailwind ad-hoc, gerando inconsistência.

**Tokens CSS** definidos em `:root` e `.dark`:
- Cores semânticas: `--background`, `--foreground`, `--primary`, `--muted`, `--accent`, etc.
- Raios: `--radius` e variações
- Fontes: `--font-sans` (Avenir Next / Segoe UI), `--font-display` (Georgia), `--font-mono`
- Animações: `--ease-spring`, `--ease-smooth`, `--duration-fast/normal/slow`

### 3. Estado global com Zustand

Quatro stores separadas por responsabilidade:

| Store | Responsabilidade | Persistência |
|---|---|---|
| `auth-store` | user + accessToken | localStorage (`facilita-auth`) |
| `ui-store` | theme + globalSearch + sidebarOpen | Sem persist (tema via localStorage manual) |
| `notification-store` | Fila de toasts (sucesso/erro/info) | Sem persist |
| `realtime-notification-store` | Notificações em tempo real do WebSocket | Sem persist |

**Avaliação:** Separação de responsabilidades boa. Os stores são enxutos e diretos. Ponto negativo: `navCollapsed` está fora do `ui-store`, gerenciado diretamente no `AppShell` com `localStorage`. Deveria estar no store.

### 4. API client centralizado com interceptors

`lib/api.ts` exporta uma instância Axios configurada com:

- **Request interceptor:** injeta o `Authorization: Bearer <token>` de forma transparente
- **Response success interceptor:** emite toast automático para mutações (POST, PATCH, PUT, DELETE) com label resolvido por URL
- **Response error interceptor (401):** tenta refresh token automaticamente antes de fazer logout
- **Response error interceptor (outros):** emite toast de erro automático

Um segundo `refreshClient` (sem interceptors) é usado para o refresh para evitar loop infinito.

**Avaliação:** Bem projetado. A abstração de notificação automática é elegante e evita que cada página precise emitir toasts manualmente. O `skipNotify: true` permite opt-out quando necessário.

**Limitação:** `resolveEntityLabel` e `resolveAction` em `api.ts` são listas de if/string que precisarão de manutenção manual a cada novo endpoint. Funciona, mas pode ficar frágil se as URLs mudarem.

### 5. Favoritos via Context + Hook

`useFavorites.tsx` usa o padrão **Context + Provider** (não Zustand) para compartilhar o estado de favoritos. O `FavoritesProvider` é montado no root layout (`app/layout.tsx`), disponível em toda a aplicação.

**Avaliação:** Correto conceitualmente, mas há oportunidade de migrar para um Zustand store (seria mais consistente com o restante do projeto) ou pelo menos centralizar a tipagem. Atualmente usa `any` em três lugares nas interfaces.

### 6. WebSocket via Provider + Hook + Store

O WebSocket segue um fluxo em três camadas:
1. `lib/socket.ts` — cria a conexão Socket.io
2. `useWebSocket.tsx` — hook que inicializa a conexão, carrega notificações iniciais e escuta eventos
3. `realtime-notification-store.ts` — store que acumula as notificações recebidas
4. `WebSocketProvider` — wrapper de componente que chama `useWebSocket`
5. `user-nav-menu.tsx` — lê o store para exibir o sino e a lista

**Avaliação:** Arquitetura em camadas clara. O problema encontrado: `realtime-notification-store.ts` tem `console.log` de debug em produção (linhas 57–65), deixados provavelmente durante o desenvolvimento.

### 7. Composição de layout (AppShell)

O layout autenticado é composto por:
```
AppLayout (server)
  └── WebSocketProvider (client)
        └── AppShell (client)
              ├── AppHeader (topbar)
              ├── aside > AppNav (sidebar)
              ├── main > {children}
              ├── footer
              └── UserNavMenu (floating)
                    └── UserProfileModal
```

**Avaliação:** Limpo e bem estruturado. A responsabilidade do `AppShell` de fazer `GET /auth/me` no mount é razoável para garantir sincronização do usuário, mas cria uma dependência de rede em todo page load.

---

## Decisões arquiteturais a considerar

### A — `navCollapsed` fora do `ui-store`

**Estado atual:** `navCollapsed` é um `useState` no `AppShell` que lê/escreve `localStorage` diretamente.

**Problema:** Inconsistente com o restante do estado de UI que já usa `ui-store`. Dificulta acesso de outros componentes ao estado de colapso sem prop drilling.

**Recomendação:** Mover para `ui-store` com `persist`.

### B — `FavoritesProvider` usa Context em vez de Zustand

**Estado atual:** O estado de favoritos usa Context API.

**Problema:** Inconsistente com o padrão do projeto (Zustand). Tem `any` types. As funções `countMyFavorites`, `countEntityFavorites` e `checkFavorited` fazem chamadas de rede avulsas em vez de usar o estado local.

**Recomendação:** Manter o padrão atual por ora (funciona), mas limpar os `any` types e os métodos que fazem chamadas redundantes.

### C — `console.log` em produção no store de notificações

**Estado atual:** `realtime-notification-store.ts` tem 6 `console.log` dentro do `addNotification`.

**Recomendação:** Remover antes de qualquer outra coisa — é um quick win de 1 linha.

### D — Sem proteção de rota no frontend

**Estado atual:** A proteção de rota depende dos guards do backend. O frontend não tem redirect explícito para usuários sem permissão que tentam acessar `/admin/permissions`, `/admin/users`, etc.

**Recomendação:** Hipótese — avaliar se isso é intencional (backend protege tudo) ou se deveria ter um middleware de route protection no Next.js.

### E — Sem testes

**Estado atual:** Zero testes automatizados.

**Impacto:** Refatorações de alta confiança requerem testes manuais extensos. A duplicação de código piora isso — um bug corrigido em Links pode não ter sido corrigido em Schedules/Notes.

---

## Convenções de código observadas

| Convenção | Observação |
|---|---|
| Componentes: PascalCase | Seguido consistentemente |
| Hooks: camelCase com `use` prefix | Seguido (exceto `FavoritesProvider` que mistura com Context) |
| Stores: `useXxxStore` | Seguido |
| Eventos: `(event)` como nome de parâmetro | Seguido consistentemente |
| Async: `void fn()` para não-awaited | Seguido |
| Imports: alias `@/` | Seguido consistentemente |
| `'use client'` no topo | Seguido em todos os componentes interativos |
| `type` vs `interface` | Misto — alguns arquivos usam `type`, outros `interface`. Não é problema, mas poderia ser padronizado. |
| Nomes em português | Labels, mensagens e nomes de funcionalidades são em pt-BR. Código (variáveis, funções) em inglês. |
