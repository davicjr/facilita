# Backend — achados da review geral (área 1/4: NestJS)

Origem: review geral do projeto (2026-07-19), skills `davi-backend:rest-resource-design`,
`authorization-rbac-design`, `layered-architecture-boundaries`, `n-plus-one-prevention`,
`database-indexing-strategy`.

## 1. Autorização checada em dois pontos que podem divergir — RESOLVIDO E VERIFICADO

- [x] Removida a checagem manual redundante em `notes.controller.ts`, `links.controller.ts`,
      `uploaded-schedules.controller.ts` (`findAllAdmin`)
- [x] `uploads.controller.ts` — **achado original estava errado**: o código em `listImages`/`getImage`
      não é uma checagem redundante, é `canUseImageLibrary()` (permissão de negócio real, sem
      `@Roles`/`RolesGuard` nessas rotas) + escopo de dados (`uploadedBy`). Não mexi — não é o
      padrão descrito, seria uma mudança errada
- [x] `npm run build` (`nest build`) limpo
- [x] **Testado contra a API rodando** (token JWT gerado com o segredo do backend, sem tocar em
      senha de ninguém): `/notes/admin/list`, `/links/admin/list`, `/schedules/admin/list` — USER
      comum recebe 403, SUPERADMIN recebe 200, confirmando que o guard sozinho já protegia

## 2. Rotas-alias duplicadas para o mesmo recurso — RESOLVIDO

- [x] Confirmado via grep que o frontend só usa `adminListPath: '.../admin/list'`, nunca o alias
      `/admin` puro — seguro remover
- [x] Alias `@Get('admin')` (`findAllAdminAlias`) removido de `notes`, `links`, `uploaded-schedules`
- [x] `npm run build` limpo

## 3. N+1 em `shares.service.ts` — RESOLVIDO E VERIFICADO

- [x] Trocado o `findFirst` por destinatário (dentro do loop) por um único `findMany` com
      `recipientId: { in: recipientIds }` + `Map` pra lookup — 1 query em vez de N
- [x] `npm run build` limpo
- [x] **Testado contra a API rodando**: criei um compartilhamento real (2 destinatários, link
      existente) — 1ª chamada cria os 2 (`totalRecipients: 2`), 2ª chamada com os mesmos
      destinatários reconhece os já existentes sem duplicar (`totalRecipients: 0`), igual ao
      comportamento original. Dados de teste ficaram no banco (usuários já são `*.teste`,
      consistente com fixtures existentes)

## 4. `status` sem índice em `Link`, `UploadedSchedule` e `Note` — RESOLVIDO E VERIFICADO

- [x] `@@index([status])` e `@@index([deletedAt, status])` adicionados nos 3 models
- [x] Migration gerada e aplicada (`20260720005758_add_status_index_content_v2`)
- [x] Confirmado direto no Postgres (`\di`) que os 6 índices existem de verdade
- [x] Tabelas pequenas hoje — migration não travou nada

**Imprevisto durante esse item**: a primeira tentativa de gerar a migration rodou dentro do
container do backend que ainda tinha o `schema.prisma` antigo (baked na imagem, não tinha visto
minhas edições) — o Prisma detectou um **drift pré-existente não relacionado** (`Friendship.id`
tinha `DEFAULT gen_random_uuid()` no banco, diferente de todo outro model `@default(uuid())` do
schema, que não tem default no nível do banco — provavelmente um acidente de quando a migration
de amigos foi escrita em 2026-07-16) e "corrigiu" isso em vez de aplicar meus índices. Confirmei
que é seguro (Prisma sempre gerou o UUID client-side pra esse campo, o default do banco nunca foi
usado de verdade) e reconciliei o histórico de migrations manualmente sem perda de dados, depois
gerei os índices reais numa migration separada. Nada quebrou, mas registro porque É o tipo de
coisa que pode confundir uma sessão futura olhando o histórico de migrations.

## 5. Busca por `contains` sem índice trigram — NÃO IMPLEMENTADO DE PROPÓSITO

Deixado como estava. Não é uma tarefa de "fazer agora" — depende de medir com volume real de
produção, que esta sessão não tem acesso. Ver nota original: se começar a doer, habilitar
`pg_trgm` + índice GIN nas colunas de texto mais buscadas.

- [ ] Medir tempo de resposta da busca global e dos filtros de texto com o volume real de produção
- [ ] Se começar a doer: habilitar extensão `pg_trgm` no Postgres e criar índice GIN nas colunas
      de texto mais buscadas (`title`, `description` em `Link`/`Note`/`UploadedSchedule`; `name`,
      `email` em `User`)
