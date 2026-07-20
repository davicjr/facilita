# Frontend — Paginação nas páginas de listagem — RESOLVIDO E VERIFICADO

Origem: usuário perguntou "temos as paginações?" após revisão geral da sessão. Auditoria encontrou
que só a galeria de imagens (`admin/images`) tinha paginação real; links/notas/documentos/usuários
tinham suporte pronto no *backend* (`page`/`pageSize` via `parsePagination`) mas o frontend nunca
usava; categorias e favoritos não tinham paginação em lugar nenhum.

## Decisão de escopo

Optei por implementar paginação **client-side** (fatiar o array já filtrado/ordenado) em vez de
wire completo do backend, pelo seguinte motivo: `admin/links`, `admin/notes`, `admin/schedules`,
`admin/categories` e `admin/users` já têm filtros de status/busca/dono aplicados 100% no cliente
(e em categorias/usuários, dropdowns de "dono"/"perfil" derivados do array completo). Mover a
paginação pro servidor exigiria também mover todos esses filtros pro servidor (backend só suporta
parcialmente — ex.: `admin/list` de links/notas/docs não tem filtro de status ACTIVE/INACTIVE
exato, só `includeInactive`), sob risco real de quebrar filtro/busca/reordenação (links tem drag
handle) numa única passada. Client-side pagination resolve o problema relatado (grid crescendo sem
limite, renderização pesada) com risco mínimo, mantendo 100% do comportamento de filtro existente.

Paginação real no backend (`page`/`pageSize`, reduz payload de rede) já existe e segue disponível
para links/notas/docs/usuários/imagens — fica como upgrade futuro se o volume de itens justificar
reduzir o payload, não só a renderização.

## Ajuste pós-feedback: itens por página responsivos

Primeira versão usava `pageSize` fixo (12), o que deixava espaço vazio feio quando o container
(redimensionável, ver feature de resize) tinha largura suficiente para várias colunas — 12 itens
raramente é múltiplo do número de colunas que cabem, sobrando uma última linha incompleta com
bastante espaço vazio à direita. Corrigido: `use-client-pagination.ts` agora mede a largura real do
grid via `ResizeObserver` (`containerRef` anexado à div do grid em cada página) e calcula
`pageSize = colunas_que_cabem × linhas_fixas (3)`, sempre múltiplo do número de colunas atual — ao
encolher o container, menos itens cabem por página automaticamente (mais páginas), ao alargar,
mais itens cabem (menos páginas), sem sobra de linha incompleta. `cardWidth` é parametrizável por
página (220px padrão, 300px em categorias, que usa card mais largo).

## Itens

- [x] `hooks/use-client-pagination.ts` — hook compartilhado: mede colunas via `ResizeObserver`,
      fatia `items[]` por `pageSize` (colunas × 3 linhas), reseta pra página 1 sempre que o array
      filtrado ou o pageSize mudam
- [x] `components/admin/pagination.tsx` — componente compartilhado (Página X de Y + Anterior/Próxima),
      mesmo estilo já usado em `admin/images`
- [x] `admin/images/page.tsx` — refatorado pra usar o componente compartilhado (dedup; já tinha
      paginação real via `useImageGallery`, não mexido)
- [x] `admin/links/page.tsx` — pagina `filtered` (12/página); em `sortMode` continua mostrando a
      lista completa pro drag-and-drop de reordenação funcionar normalmente
- [x] `admin/notes/page.tsx` — mesmo padrão
- [x] `admin/schedules/page.tsx` — mesmo padrão
- [x] `admin/categories/page.tsx` — mesmo padrão
- [x] `admin/users/page.tsx` — mesmo padrão
- [x] `favoritos/page.tsx` — mesmo padrão (paginação depois do filtro de categoria/tipo/busca)
- [x] `(app)/page.tsx` (home "Início") — mesmo padrão
- [x] `compartilhados/page.tsx` — **deliberadamente não paginado**: usa `CardCarousel` (scroll
      horizontal), que já lida com listas longas sem crescer verticalmente; paginação por página
      seria inconsistente com esse padrão de UX

## Verificação

- [x] `npm run build` (`next build`) limpo, zero erros de TypeScript, todas as 25 rotas geradas
- [x] Deploy (`docker compose build frontend && docker compose up -d frontend`) e todas as páginas
      afetadas retornando HTTP 200 via curl: `/`, `/favoritos`, `/admin/links`, `/admin/notes`,
      `/admin/schedules`, `/admin/categories`, `/admin/users`, `/admin/images`, `/compartilhados`
- [ ] Teste manual no navegador: confirmar que trocar de página preserva filtros ativos, resetar
      pra página 1 ao mudar filtro/busca, e que o Reordenar de links ainda funciona com >12 itens
