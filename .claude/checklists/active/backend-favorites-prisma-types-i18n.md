# Backend — FavoritesService: tipos Prisma e mensagens em português — RESOLVIDO E VERIFICADO

Origem: `refatoracao/backend/checklist-4-categories-shares-favorites.md` (itens não concluídos).
Arquivo: `backend/src/favorites/favorites.service.ts`

## Tipos

- [x] `Prisma` importado de `@prisma/client`
- [x] `where: any` → `Prisma.FavoriteWhereInput` em `isFavorited`, `removeByEntity`, `countByEntity`

## Mensagens de erro em português

- [x] Todas as mensagens da tabela original traduzidas (entidade não suportada, IDs obrigatórios,
      já nos favoritos, favorito não encontrado, não pode remover de outro usuário, removido com
      sucesso)

## Verificação

- [x] `npm run build` (`nest build`) limpo
- [x] **Testado contra a API rodando de ponta a ponta**: criar favorito (201) → checar
      `isFavorited` (true) → criar de novo → `409` com `"Este item já está nos favoritos"` →
      remover por entidade (200, `"Favorito removido com sucesso"`) → remover de novo → `404`
      com `"Favorito não encontrado"`. Mensagens em português confirmadas na resposta real da API,
      não só no código-fonte
