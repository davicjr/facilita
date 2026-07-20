# Backend - Checklist 2: setStatus + BaseContentDto

> Arquivo criado:
> - `v2/backend/src/common/dto/base-content.dto.ts`
>
> Arquivos alterados:
> - `v2/backend/src/links/links.service.ts`
> - `v2/backend/src/links/links.controller.ts`
> - `v2/backend/src/links/dto/create-link.dto.ts`
> - `v2/backend/src/links/dto/update-link.dto.ts`
> - `v2/backend/src/notes/notes.service.ts`
> - `v2/backend/src/notes/notes.controller.ts`
> - `v2/backend/src/notes/dto/create-note.dto.ts`
> - `v2/backend/src/notes/dto/update-note.dto.ts`
> - `v2/backend/src/uploaded-schedules/uploaded-schedules.service.ts`
> - `v2/backend/src/uploaded-schedules/uploaded-schedules.controller.ts`
> - `v2/backend/src/uploaded-schedules/dto/create-schedule.dto.ts`
> - `v2/backend/src/uploaded-schedules/dto/update-schedule.dto.ts`
>
> Pré-requisito: Checklist 1 concluído
>
> Atualizado em: 2026-04-02

---

## Parte A - `setStatus`

### A1 - `LinksService`

- [x] `activate()` removido de `LinksService`
- [x] `deactivate()` removido de `LinksService`
- [x] `setStatus()` adicionado em `LinksService`

### A2 - `LinksController`

- [x] Controller atualizado para chamar `setStatus(id, actor, EntityStatus.ACTIVE)`
- [x] Controller atualizado para chamar `setStatus(id, actor, EntityStatus.INACTIVE)`
- [x] `EntityStatus` importado no controller

### A3 - `NotesService` e `NotesController`

- [x] `activate()` removido de `NotesService`
- [x] `deactivate()` removido de `NotesService`
- [x] `setStatus()` adicionado em `NotesService`
- [x] Controller atualizado para `setStatus` com `EntityStatus.ACTIVE`
- [x] Controller atualizado para `setStatus` com `EntityStatus.INACTIVE`

### A4 - `UploadedSchedulesService` e `UploadedSchedulesController`

- [x] `activate()` removido de `UploadedSchedulesService`
- [x] `deactivate()` removido de `UploadedSchedulesService`
- [x] `setStatus()` adicionado em `UploadedSchedulesService`
- [x] Controller atualizado para `setStatus` com `EntityStatus.ACTIVE`
- [x] Controller atualizado para `setStatus` com `EntityStatus.INACTIVE`

Observação:
As rotas HTTP permaneceram iguais. Só a implementação interna foi consolidada.

---

## Parte B - `BaseContentDto`

### B1 - Criar `BaseContentDto`

- [x] Arquivo criado em `v2/backend/src/common/dto/base-content.dto.ts`

### B2 - Atualizar `CreateLinkDto`

- [x] 8 campos comuns removidos de `CreateLinkDto`
- [x] `CreateLinkDto extends BaseContentDto`
- [x] Imports não usados removidos

### B3 - Atualizar `UpdateLinkDto`

- [x] `UpdateLinkDto` simplificado para `PartialType(CreateLinkDto)`

### B4 - Atualizar `CreateNoteDto`

- [x] 8 campos comuns removidos de `CreateNoteDto`
- [x] `CreateNoteDto extends BaseContentDto`

### B5 - Atualizar `UpdateNoteDto`

- [x] `UpdateNoteDto` simplificado para `PartialType(CreateNoteDto)`

### B6 - Atualizar `CreateScheduleDto`

- [x] 8 campos comuns removidos de `CreateScheduleDto`
- [x] `CreateScheduleDto extends BaseContentDto`

### B7 - Atualizar `UpdateScheduleDto`

- [x] `UpdateScheduleDto` simplificado para `PartialType(CreateScheduleDto)`

---

## Validação final

- [x] `npm run build` sem erros em `v2/backend`
- [ ] Testar criação de conteúdo com `visibility: PUBLIC` para confirmar que o DTO continua aceitando o campo via herança
- [ ] Testar activate e deactivate pelo frontend para confirmar que as rotas continuam funcionando

---

## Resultado

O segundo checklist do backend foi concluído em código. As pendências restantes desta etapa são apenas os testes manuais integrados.
