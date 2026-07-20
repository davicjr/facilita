# Backend - Checklist 3: Dívidas Técnicas

> Arquivo criado:
> - `v2/backend/src/common/filters/all-exceptions.filter.ts`
>
> Arquivos alterados:
> - `v2/backend/src/main.ts`
> - `v2/backend/src/users/users.service.ts`
> - `v2/backend/src/links/links.service.ts`
> - `v2/backend/src/notes/notes.service.ts`
> - `v2/backend/src/uploaded-schedules/uploaded-schedules.service.ts`
> - `v2/backend/src/auth/auth.service.ts`
> - `v2/backend/src/common/services/content-helpers.service.ts`
>
> Pré-requisito: nenhum
>
> Atualizado em: 2026-04-02

---

## Parte A - `AllExceptionsFilter`

### A1 - Criar o filtro global

- [x] Arquivo criado em `v2/backend/src/common/filters/all-exceptions.filter.ts`
- [x] `HttpException` preservada sem reformatar a resposta original
- [x] `PrismaClientKnownRequestError` mapeado para `409` (`P2002`) e `404` (`P2025`)
- [x] Erros desconhecidos logados e convertidos para `500`

### A2 - Registrar em `main.ts`

- [x] Import adicionado em `main.ts`
- [x] `app.useGlobalFilters(new AllExceptionsFilter())` registrado

---

## Parte B - Mensagens de erro em português

### B1 - `LinksService`

- [x] Mensagens de link não encontrado traduzidas para português
- [x] Mensagens de acesso negado traduzidas para português
- [x] Mensagem de link público não encontrado traduzida para português

### B2 - `NotesService`

- [x] Mensagens de nota não encontrada traduzidas para português
- [x] Mensagens de acesso negado traduzidas para português
- [x] Mensagem de nota pública não encontrada traduzida para português

### B3 - `UploadedSchedulesService`

- [x] Mensagens de documento não encontrado traduzidas para português
- [x] Mensagens de acesso negado traduzidas para português
- [x] Mensagem de documento público não encontrado traduzida para português

### B4 - `AuthService`

- [x] `Invalid credentials` traduzido para `Credenciais inválidas`
- [x] `Refresh token missing` traduzido para `Token de renovação ausente`
- [x] `Refresh token invalid` traduzido para `Token de renovação inválido`
- [x] `User not found` traduzido para `Usuário não encontrado`

### B5 - `ContentHelpersService`

- [x] `Category not authorized` traduzido para `Categoria não autorizada`
- [x] `Document not authorized` traduzido para `Documento não autorizado`

---

## Parte C - Refatorar `UsersService.update` e `updateProfile`

### C1 - Extrair `buildUserUpdateData`

- [x] Método `buildUserUpdateData` criado
- [x] Tipagem do helper limitada aos campos comuns entre `UpdateUserDto` e `UpdateProfileDto`
- [x] Hash de senha e checagem de email duplicado centralizados

### C2 - Simplificar `update`

- [x] `update()` simplificado para usar `buildUserUpdateData`
- [x] Campos exclusivos de admin (`role`, `status`) aplicados depois do helper

### C3 - Simplificar `updateProfile`

- [x] `updateProfile()` simplificado para usar `buildUserUpdateData`

---

## Validação final

- [x] `npm run build` sem erros em `v2/backend`
- [ ] Testar login com credenciais inválidas para confirmar mensagem em português
- [ ] Testar criação de usuário com email duplicado para confirmar que continua lançando `ConflictException`
- [ ] Testar update de perfil para confirmar que continua funcionando

---

## Resultado

O terceiro checklist do backend foi concluído em código. As pendências restantes são apenas os testes manuais integrados.
