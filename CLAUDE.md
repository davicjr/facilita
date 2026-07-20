# Facilita V2

Portal interno para links, documentos e notas, com permissões granulares, compartilhamento
entre usuários, chat em tempo real e administração centralizada.

## Stack

- **Backend**: NestJS 11, TypeScript, Prisma 7, PostgreSQL, Socket.io (WebSocket), JWT + refresh token
- **Frontend**: Next.js 16 (App Router), React 19, Zustand, Tailwind CSS 4
- **Infra**: Docker Compose, Nginx como proxy reverso

## Estrutura

```
backend/      NestJS — módulos por domínio em src/ (auth, links, notes, uploaded-schedules,
              categories, shares, favorites, friends, chat, notifications, permissions,
              system-config, users, backups, resets, search, dashboard)
frontend/     Next.js App Router — src/app, src/components, src/hooks, src/lib, src/stores
nginx/        config do proxy
docs/         planejamento histórico (plano.md é a proposta original de reescrita — desatualizada
              em detalhes de versão, mas útil para entender a motivação do projeto)
              docs/archive/ guarda docs de fases anteriores sem uso corrente (changelogs,
              guias de migração, scripts de setup manual pré-Docker)
refatoracao/  auditoria e checklists de refatoração do frontend/backend, gerados em 2026-04-01
              (00-index.md é o inventário completo; maioria dos itens já concluída em código —
              os caminhos citados lá ainda usam o prefixo `v2/` antigo, é só histórico)
```

Até 2026-07-20 o projeto vivia todo dentro de uma pasta `v2/` (não havia um "v1" para
diferenciar). A estrutura foi achatada para a raiz do repo — `backend/`, `frontend/`, `nginx/`
e `docs/` agora ficam direto na raiz, junto de `refatoracao/`.

## Peculiaridades

- **Design system `fac-*`**: classes utilitárias e tokens CSS em `globals.css`. Usar
  `fac-panel`, `fac-loading-state`, `fac-error-state`, `fac-empty-state` etc. em vez de
  Tailwind cru para estados de página — é o padrão já adotado na maior parte do frontend.
- **Três CRUDs quase-idênticos**: `admin/links`, `admin/schedules` (documentos) e `admin/notes`
  compartilham estrutura de estado, funções de load/save/toggle/remove e JSX. Utilitários comuns
  já foram centralizados em `lib/image.ts`, `lib/error.ts`, `lib/format.ts` — ao tocar em um
  desses três, verificar se a mudança deveria ir para o utilitário compartilhado, não só ali.
- **Soft delete** consistente no banco (`deletedAt`) — nunca hard-delete em entidades de conteúdo.
- **Backup/Restore/Reset** (`admin/backup`, `admin/restore`, `admin/reset`) são operações de alto
  risco — qualquer mudança nelas exige atenção redobrada e teste manual antes de commitar.
- **Permissões**: guardadas via `PermissionFlags` (backend) checadas em cada service; frontend
  ainda não tem redirect explícito de rota para USER tentando acessar `/admin/*` — a proteção
  hoje é só a sidebar não mostrar o link e o backend recusar a chamada.

## Estado

- **Testes automatizados só no backend, cobertura ainda parcial** (frontend continua zero — maior
  dívida técnica conhecida do lado frontend). Jest configurado em `backend/` (`npm test` para
  unitários, `npm run test:e2e` para e2e). Cobertura atual: `permissions.service`,
  `resets.service`, `favorites.service`, `shares.service`, validação de CORS
  (`common/utils/cors.ts`) e um e2e de autenticação (login, validação de payload, rate limit) em
  `backend/test/auth.e2e-spec.ts`. O e2e precisa de um banco `facilita_test` com as migrations
  aplicadas (mesmo Postgres do docker compose, `DATABASE_URL` apontando pra ele) — não roda contra
  o banco de dev. Ao adicionar código novo em área crítica (auth, permissions, backups/resets),
  seguir o padrão já estabelecido nesses arquivos (mock do `PrismaService`, sem `--force` em
  dependências) — considerar `/davi-core:tdd` mesmo com cobertura ainda incompleta.
- Sem CI configurado.
- Backlog ativo de trabalho pendente: ver `.claude/checklists/active/`.
- Backlog de validação manual de UI (pós-refatoração visual) vive em `refatoracao/pages/*.md` —
  checkboxes não marcados ali são "testar no navegador", não código pendente.

## O que NÃO fazer

- Não reimplementar lógica de seed em `ResetsService` — ver checklist de refactor pendente.
- Não usar `window.confirm()` para novas confirmações de exclusão — o padrão do projeto é
  `ConfirmModal` (já usado em `admin/links`, `admin/schedules`, `admin/notes`, `admin/reset`,
  `admin/images`).
- Não hardcodar `where: any` em queries Prisma — tipar com `Prisma.<Model>WhereInput`.

## Skills-chave deste projeto

Sempre: `/davi-core:architect`, `/davi-core:commit`, `/davi-core:review`, `/davi-core:tdd`,
`/davi-core:retro`.

- `/davi-backend:rest-resource-design`, `schema-dto-separation`, `authorization-rbac-design`,
  `test-pyramid-for-apis` — módulos NestJS
- `/davi-ux:design-system`, `verify-ui` — qualquer mudança de UI, dado o padrão `fac-*` já
  estabelecido
- `/davi-padroes:duplicate-code-detection` — antes de tocar nos três CRUDs quase-idênticos
- `/davi-core:security` — mudanças em auth, permissions ou upload
