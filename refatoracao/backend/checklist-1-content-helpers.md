# Backend - Checklist 1: ContentHelpersService

> Arquivos criados:
> - `v2/backend/src/common/services/content-helpers.service.ts`
> - `v2/backend/src/common/common.module.ts`
>
> Arquivos alterados:
> - `v2/backend/src/links/links.module.ts`
> - `v2/backend/src/links/links.service.ts`
> - `v2/backend/src/notes/notes.module.ts`
> - `v2/backend/src/notes/notes.service.ts`
> - `v2/backend/src/uploaded-schedules/uploaded-schedules.module.ts`
> - `v2/backend/src/uploaded-schedules/uploaded-schedules.service.ts`
>
> Atualizado em: 2026-04-02

---

## Objetivo

Extrair os 5 métodos privados duplicados dos três serviços de conteúdo para um serviço compartilhado, sem alterar a interface pública dos endpoints.

---

## Etapa 1 - Criar `ContentHelpersService`

- [x] Arquivo criado em `v2/backend/src/common/services/content-helpers.service.ts`
- [x] Helpers centralizados: `withShareMetadata`, `normalizeVisibility`, `ensurePublicToken`, `assertCategoryOwner`, `assertCanMutate`
- [x] `PrismaService` injetado no helper compartilhado

Observação:
`assertCanMutate` aceita mensagem customizada para preservar as respostas já existentes de Link e Note, mantendo a refatoração sem regressão de comportamento externo.

---

## Etapa 2 - Criar `CommonModule`

- [x] Arquivo criado em `v2/backend/src/common/common.module.ts`
- [x] `PrismaModule` importado
- [x] `ContentHelpersService` registrado e exportado

---

## Etapa 3 - Atualizar `LinksModule`

- [x] `CommonModule` importado em `v2/backend/src/links/links.module.ts`

---

## Etapa 4 - Atualizar `LinksService`

- [x] Import do `ContentHelpersService` adicionado
- [x] `randomUUID` removido do arquivo
- [x] Construtor atualizado com `helpers`
- [x] 5 métodos privados removidos
- [x] Todas as chamadas migradas para `this.helpers.*`

---

## Etapa 5 - Atualizar `NotesModule`

- [x] `CommonModule` importado em `v2/backend/src/notes/notes.module.ts`

---

## Etapa 6 - Atualizar `NotesService`

- [x] Import do `ContentHelpersService` adicionado
- [x] `randomUUID` removido do arquivo
- [x] Construtor atualizado com `helpers`
- [x] 5 métodos privados removidos
- [x] Todas as chamadas migradas para `this.helpers.*`

---

## Etapa 7 - Atualizar `UploadedSchedulesModule`

- [x] `CommonModule` importado em `v2/backend/src/uploaded-schedules/uploaded-schedules.module.ts`

---

## Etapa 8 - Atualizar `UploadedSchedulesService`

- [x] Import do `ContentHelpersService` adicionado
- [x] `randomUUID` removido do arquivo
- [x] Construtor atualizado com `helpers`
- [x] 5 métodos privados removidos
- [x] Todas as chamadas migradas para `this.helpers.*`

---

## Etapa 9 - Validação

- [x] `npm run build` sem erros em `v2/backend`
- [ ] Testar manualmente pelo frontend: criar, editar e remover link, nota e documento para confirmar visibilidade e validação de categoria

---

## Resultado

O primeiro checklist do backend foi concluído em código. A única pendência restante é a validação manual integrada via frontend.
