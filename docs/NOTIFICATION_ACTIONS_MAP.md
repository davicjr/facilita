# Mapeamento de Ações e Notificações

## Tipos de Notificação

### Existentes
- `CONTENT_CREATED` - Conteúdo criado
- `CONTENT_UPDATED` - Conteúdo editado
- `CONTENT_DELETED` - Conteúdo deletado
- `FAVORITE_UPDATED` - Favorito atualizado
- `FAVORITE_DELETED` - Favorito deletado

### Novos
- `CONTENT_RESTORED` - Conteúdo restaurado
- `CONTENT_ACTIVATED` - Conteúdo ativado
- `CONTENT_DEACTIVATED` - Conteúdo desativado
- `CONTENT_FAVORITED` - Conteúdo adicionado aos favoritos
- `CONTENT_UNFAVORITED` - Conteúdo removido dos favoritos

## Ações por Entidade (Links, Notes, Schedules)

### 1. Criar (CREATE)
- **Quem notifica**: Todos os usuários com acesso ao conteúdo (baseado em audience)
- **Tipo**: `CONTENT_CREATED`
- **Mensagem**: "Link/Nota/Documento '{title}' foi publicado"
- **ActionURL**: `/?highlight={type}-{id}`
- **Status**: ✅ Implementado

### 2. Editar (UPDATE)
- **Quem notifica**: Usuários que favoritaram o conteúdo
- **Tipo**: `FAVORITE_UPDATED`
- **Mensagem**: "Link/Nota/Documento favoritado '{title}' foi atualizado"
- **ActionURL**: `/?highlight={type}-{id}`
- **Status**: ✅ Implementado

### 3. Deletar (DELETE)
- **Quem notifica**:
  - Todos os usuários com acesso (baseado em audience)
  - Usuários que favoritaram (separadamente com tipo FAVORITE_DELETED)
- **Tipo**: `CONTENT_DELETED` e `FAVORITE_DELETED`
- **Mensagem**: "Link/Nota/Documento '{title}' foi removido"
- **ActionURL**: `undefined` (abre modal)
- **Metadata**: `adminMessage` (opcional)
- **Status**: ✅ Implementado

### 4. Restaurar (RESTORE)
- **Quem notifica**: Todos os usuários com acesso ao conteúdo
- **Tipo**: `CONTENT_RESTORED`
- **Mensagem**: "Link/Nota/Documento '{title}' foi restaurado"
- **ActionURL**: `/?highlight={type}-{id}`
- **Status**: ✅ Implementado

### 5. Ativar (ACTIVATE)
- **Quem notifica**: Todos os usuários com acesso ao conteúdo
- **Tipo**: `CONTENT_ACTIVATED`
- **Mensagem**: "Link/Nota/Documento '{title}' foi ativado e está disponível"
- **ActionURL**: `/?highlight={type}-{id}`
- **Status**: ✅ Implementado

### 6. Desativar (DEACTIVATE)
- **Quem notifica**:
  - Todos os usuários com acesso
  - Usuários que favoritaram (com mensagem especial)
- **Tipo**: `CONTENT_DEACTIVATED`
- **Mensagem**: "Link/Nota/Documento '{title}' foi desativado"
- **ActionURL**: `undefined` (item inativo, sem redirect)
- **Status**: ✅ Implementado

### 7. Favoritar (FAVORITE)
- **Quem notifica**: Criador do conteúdo (se não for o próprio favoritando)
- **Tipo**: `CONTENT_FAVORITED`
- **Mensagem**: "Seu link/nota/documento '{title}' foi favoritado por {userName}"
- **ActionURL**: `/?highlight={type}-{id}`
- **Status**: ✅ Implementado

### 8. Desfavoritar (UNFAVORITE)
- **Quem notifica**: Ninguém (ação silenciosa)
- **Status**: Não gera notificação

## Implementação Necessária

### Backend

#### 1. Atualizar Prisma Schema
```prisma
enum NotificationType {
  CONTENT_DELETED
  CONTENT_CREATED
  CONTENT_UPDATED
  CONTENT_RESTORED      // NOVO
  CONTENT_ACTIVATED     // NOVO
  CONTENT_DEACTIVATED   // NOVO
  FAVORITE_UPDATED
  FAVORITE_DELETED
  CONTENT_FAVORITED     // NOVO
}
```

#### 2. Services a Modificar

**LinksService / NotesService / UploadedSchedulesService:**
- ✅ `create()` - já notifica
- ✅ `update()` - já notifica
- ✅ `remove()` - já notifica
- ✅ `restore()` - IMPLEMENTADO com notificação
- ✅ `activate()` - IMPLEMENTADO método + notificação
- ✅ `deactivate()` - IMPLEMENTADO método + notificação

**FavoritesService:**
- ✅ `create()` - IMPLEMENTADO notificação para o criador do conteúdo
- ✅ `remove()` - Mantido silencioso

#### 3. Controllers a Modificar

**LinksController / NotesController / UploadedSchedulesController:**
- ✅ Endpoint `POST /:id/activate` IMPLEMENTADO
- ✅ Endpoint `POST /:id/deactivate` IMPLEMENTADO
- ✅ Endpoint `POST /:id/restore` ATUALIZADO com notificações

**FavoritesController:**
- ✅ `POST /` MODIFICADO para notificar criador

### Frontend

#### 1. Atualizar Store Types
```typescript
export type NotificationType =
  | 'CONTENT_DELETED'
  | 'CONTENT_CREATED'
  | 'CONTENT_UPDATED'
  | 'CONTENT_RESTORED'      // NOVO
  | 'CONTENT_ACTIVATED'     // NOVO
  | 'CONTENT_DEACTIVATED'   // NOVO
  | 'FAVORITE_UPDATED'
  | 'FAVORITE_DELETED'
  | 'CONTENT_FAVORITED';    // NOVO
```

## Prioridade de Implementação

1. **Alta**: Restaurar, Ativar, Desativar (funcionalidades já existem, só falta notificar)
2. **Média**: Favoritar (notificar criador é nice-to-have)
3. **Baixa**: Desfavoritar (não precisa notificar)
