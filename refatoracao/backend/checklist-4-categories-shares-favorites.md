# Backend — Checklist 4: Categories, Shares e Favorites

> Arquivos a alterar:
> - `v2/backend/src/categories/categories.service.ts`
> - `v2/backend/src/shares/shares.service.ts`
> - `v2/backend/src/favorites/favorites.service.ts`
>
> Atualizado em: 2026-04-03

---

## Resumo

Três serviços com problemas menores e independentes entre si. Nenhum afeta interfaces públicas — são correções internas de qualidade.

---

## Parte A — `CategoriesService`

### A1 — Substituir string literals por enums

O serviço usa `'ACTIVE'` e `'SUPERADMIN'` como strings literais em vez dos enums importados de `@prisma/client`. Isso compila, mas quebra silenciosamente se os valores do enum mudarem.

Adicionar imports:
```typescript
import { EntityStatus, UserRole } from '@prisma/client';
```

Substituir:
- `status: 'ACTIVE'` (em `create` e `findAll`) → `status: EntityStatus.ACTIVE`
- `actor.role !== 'SUPERADMIN'` (em `update` e `remove`) → `actor.role !== UserRole.SUPERADMIN`

- [ ] `EntityStatus` e `UserRole` importados de `@prisma/client`
- [ ] `'ACTIVE'` substituído por `EntityStatus.ACTIVE` em `findAll` e `create`
- [ ] `'SUPERADMIN'` substituído por `UserRole.SUPERADMIN` em `update` e `remove`

### A2 — Mensagens de erro em português

- `'Category not found'` → `'Categoria não encontrada'`
- `'Category not authorized'` → `'Categoria não autorizada'`

- [ ] Mensagens traduzidas para português

---

## Parte B — `SharesService`

### B1 — Acento faltando em mensagem de notificação

```typescript
// linha 123 — falta acento em "voce"
message: `${entity.title} foi compartilhado com voce`,
```

→ `'foi compartilhado com você'`

- [ ] `'com voce'` → `'com você'`

### B2 — Mensagens de erro em inglês

Substituir as mensagens de erro em inglês por português:

| Atual | Novo |
|---|---|
| `'Superadmin cannot use share flow'` | `'Superadmin não pode usar o fluxo de compartilhamento'` |
| `'Unsupported entity type for share'` | `'Tipo de entidade não suportado para compartilhamento'` |
| `'At least one recipient is required'` | `'Pelo menos um destinatário é obrigatório'` |
| `'Cannot share with yourself'` | `'Não é possível compartilhar consigo mesmo'` |
| `'One or more recipients do not exist'` | `'Um ou mais destinatários não existem'` |
| `'Recipients must be active users and cannot be superadmin'` | `'Destinatários devem ser usuários ativos e não podem ser superadmin'` |
| `'Link not found'` | `'Link não encontrado'` |
| `'Document not found'` | `'Documento não encontrado'` |
| `'Note not found'` | `'Nota não encontrada'` |
| `'You can only share your own content'` | `'Você só pode compartilhar seu próprio conteúdo'` |
| `'Share not found'` | `'Compartilhamento não encontrado'` |
| `'Share is revoked'` | `'Compartilhamento foi revogado'` |
| `'Only recipient can set local category'` | `'Somente o destinatário pode definir a categoria local'` |
| `'Category not authorized'` | `'Categoria não autorizada'` |
| `'Only recipient can remove a received share'` | `'Somente o destinatário pode remover um compartilhamento recebido'` |
| `'Only owner can revoke a share'` | `'Somente o proprietário pode revogar um compartilhamento'` |

- [ ] Todas as mensagens de erro traduzidas para português

### B3 — Mensagem de revogação com acento

```typescript
// linha 212
message: 'Um compartilhamento foi revogado pelo proprietario',
```

→ `'Um compartilhamento foi revogado pelo proprietário'`

- [ ] `'proprietario'` → `'proprietário'`

---

## Parte C — `FavoritesService`

### C1 — Remover `where: any` com tipagem explícita

Os métodos `isFavorited`, `removeByEntity` e `countByEntity` usam `const where: any = { ... }` para construir o filtro dinamicamente. Isso perde a segurança de tipo do Prisma.

Substituir o `where: any` por `Prisma.FavoriteWhereInput`:

```typescript
import { Prisma } from '@prisma/client';

// Em vez de:
const where: any = { userId, entityType };
if (entityType === EntityType.LINK) where.linkId = entityId;

// Usar:
const where: Prisma.FavoriteWhereInput = {
  userId,
  entityType,
  ...(entityType === EntityType.LINK ? { linkId: entityId } : {}),
  ...(entityType === EntityType.SCHEDULE ? { scheduleId: entityId } : {}),
  ...(entityType === EntityType.NOTE ? { noteId: entityId } : {}),
};
```

Aplicar nos três métodos: `isFavorited`, `removeByEntity`, `countByEntity`.

- [ ] `Prisma` importado de `@prisma/client` (se não estiver)
- [ ] `where: any` substituído por `Prisma.FavoriteWhereInput` em `isFavorited`
- [ ] `where: any` substituído por `Prisma.FavoriteWhereInput` em `removeByEntity`
- [ ] `where: any` substituído por `Prisma.FavoriteWhereInput` em `countByEntity`

### C2 — Mensagens de erro em inglês

| Atual | Novo |
|---|---|
| `'Unsupported entity type for favorites'` | `'Tipo de entidade não suportado para favoritos'` |
| `'Content not found or not accessible'` | `'Conteúdo não encontrado ou sem acesso'` |
| `'This item is already in favorites'` | `'Este item já está nos favoritos'` |
| `'Provide exactly one ID (linkId, scheduleId or noteId)'` | `'Forneça exatamente um ID (linkId, scheduleId ou noteId)'` |
| `'linkId is required when entityType = LINK'` | `'linkId é obrigatório quando entityType = LINK'` |
| `'scheduleId is required when entityType = SCHEDULE'` | `'scheduleId é obrigatório quando entityType = SCHEDULE'` |
| `'noteId is required when entityType = NOTE'` | `'noteId é obrigatório quando entityType = NOTE'` |
| `'Entity ID is required'` | `'ID da entidade é obrigatório'` |
| `'Favorite not found'` | `'Favorito não encontrado'` |
| `'You cannot remove favorites from other users'` | `'Você não pode remover favoritos de outros usuários'` |
| `'Favorite removed successfully'` | `'Favorito removido com sucesso'` |

- [ ] Todas as mensagens traduzidas para português

---

## Validação final

- [ ] `npm run build` sem erros
- [ ] Verificar que o frontend exibe corretamente as novas mensagens (toast de erro em fluxos de compartilhamento e favoritos)
