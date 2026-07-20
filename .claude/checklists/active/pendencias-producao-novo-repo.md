---
feature: pendencias-producao-novo-repo
status: active
created: 2026-07-20
---

# Pendências antes de produção (cópia da branch `individual` como `main` em outro repo)

Plano: a branch `individual` deste repo vai ser copiada para outro perfil do GitHub e virar
`main` lá. CI/CD, HTTPS e o restante da infra de produção serão configurados no repo novo. Este
checklist registra o que precisa estar resolvido (ou pelo menos decidido) antes de considerar o
projeto "pronto para produção".

## Tarefas

### Infra que só existe no repo novo
- [ ] CI/CD — nenhum configurado hoje neste repo; será criado no novo.
- [ ] HTTPS/TLS — `nginx/nginx.conf` só tem `listen 80`; falta `listen 443 ssl` + certificado real
      (depende de domínio de produção, que só existe no ambiente novo).
- [ ] `CORS_ORIGIN` de produção — `.env.production` está com o placeholder
      `CHANGE_ME_TO_REAL_PRODUCTION_DOMAIN`. Com o boot fail-closed adicionado em `main.ts`
      (commit `security:`), a aplicação não quebra ao subir com esse valor, mas o CORS vai
      recusar toda origem real até alguém trocar pelo domínio verdadeiro do frontend.

### Cópia do repositório
- [ ] Ao copiar a branch `individual` para o novo repo, preferir **squash / histórico novo** em
      vez de `git clone` completo do histórico. Isso resolve de graça a pendência de segredos
      antigos commitados em algum ponto do histórico (`.env`, `.env.production`,
      `backend/.env` já apareceram staged como removidos numa sessão anterior — sinal de que
      passaram por commits antigos). Reescrever o histórico *deste* repo via `git filter-repo`
      não é necessário se a cópia já nascer limpa.
- [ ] Registrar que a `main` deste repo atual (facilita) fica 24 commits atrás da `individual` e
      não vai receber esse trabalho — decidir se vale um aviso no README ou se o repo atual é
      simplesmente abandonado em favor do novo.

### Segurança
- [x] Rate limiting em `/auth/login` e `/auth/refresh` + throttler global (commit `security:`).
- [x] CORS fail-closed — falha o boot se `CORS_ORIGIN` vazio, bloqueia wildcard em produção
      (commit `security:`).
- [x] Containers non-root (gosu no backend, `USER node` no frontend) (commit `security:`).
- [x] Senha do `DATABASE_URL` em `backend/.env` conferida nesta sessão — já é uma senha gerada
      (não é mais `admin`), assim como `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET` e
      `JWT_REFRESH_SECRET` em `.env`. `.env.example` (raiz e `backend/`) só têm placeholders.
- [x] Mapa de credenciais documentado em `docs/mapa-credenciais.md`.
- [x] `npm audit` no backend — **fix cirúrgico aplicado em 2026-07-20** (`brace-expansion@2.0.2`
      isolado, sem tocar em nada do toolchain do Prisma). Testado em container `builder`
      isolado (build + 36 testes) antes de aplicar ao lockfile real; rebuild real confirmado
      saudável. `npm audit fix` genérico sem force **continua quebrando o Prisma** (reconfirmado
      nesta sessão, mesmo sintoma) — não vale a pena, a maior parte do que resta no audit geral
      é devDependency de build (webpack/`@nestjs/cli`/schematics Angular), não roda em produção.
      Achado novo (ver seção "Imagem de produção" abaixo): essas devDependencies não deveriam
      nem estar na imagem final.
      - [ ] As vulnerabilidades restantes via `--force` (downgrade de `prisma@7.x` pra `6.19.3`)
            seguem não aplicadas — risco real baixo (`@hono/node-server` só roda em tooling de
            dev do Prisma), mas exigiria avaliar quebra de schema/adapter-pg antes.

### Imagem de produção — achado novo (2026-07-20)
- [ ] **`backend/Dockerfile` e `frontend/Dockerfile` copiam `node_modules` inteiro (com
      devDependencies) pro estágio `runner`** — é por isso que o `npm audit` geral mostra ~40
      vulnerabilidades: a maioria é ferramenta de build (webpack, `@nestjs/cli`, Angular
      schematics, babel) que não deveria estar na imagem de produção, contraria o próprio
      princípio de `multi-stage-build-design` (davi-padroes). Fix: `npm ci --omit=dev` (ou
      `npm prune --omit=dev` pós-build) antes do `COPY --from=builder .../node_modules` — não
      apliquei ainda, é mudança estrutural no Dockerfile que merece teste próprio (confirmar que
      nada em runtime depende de um pacote dev) antes de entrar nesta sessão.

### Testes automatizados
- [x] Infraestrutura de testes (Jest) no backend — configurada nesta sessão (`npm test`,
      `npm run test:e2e`, `npm run test:cov`).
- [x] Testes unitários: `permissions.service` (10), `resets.service` (5), `favorites.service`
      (9), `shares.service` (3), validação de `CORS_ORIGIN` (9) — 36 testes, todos passando.
- [x] Testes e2e básicos de autenticação (login, validação de payload, rate limit) em
      `backend/test/auth.e2e-spec.ts` — 4 testes passando contra banco `facilita_test` dedicado
      (mesma instância Postgres do compose, migrations aplicadas via `prisma migrate deploy`).
      **No repo novo, o CI precisa provisionar esse banco de teste** (criar `facilita_test` +
      rodar migrations) antes de rodar `npm run test:e2e` — hoje isso foi feito manualmente.
- [x] **Expandido em 2026-07-20**: `categories`, `links`, `notes`, `uploaded-schedules`, `users`
      cobertos em unit (114 testes no total, todos passando). Padrão: `PrismaService` e
      `ContentHelpersService` mockados via `Test.createTestingModule`, cobrindo viewer nulo,
      owner, SUPERADMIN, soft-delete/restore, e (em `uploaded-schedules`) o acesso via share ativo
      em `getDownloadInfo`. `users.service` cobre também conflito de e-mail, hash de senha
      (bcrypt mockado) e bloqueio de auto-exclusão.
- [ ] Cobertura ainda parcial: faltam `chat`, `notifications`, `backups`, `search` em unit; e2e
      cobre só auth, não permissions/CRUD/backup-restore.
- [ ] Frontend segue sem testes — fora do escopo desta rodada, registrar como débito conhecido.

### Verificação manual
- [ ] Testar no navegador os fluxos que só foram revisados por diff nesta sessão: paginação
      (categorias/imagens/links/notas/permissões/agendas/usuários/início/favoritos), painel de
      compartilhamento + posição de imagem, subpáginas de configurações (atalhos, backups
      automáticos), área de conteúdo redimensionável, `ConfirmModal` ao apagar conversa no chat.
- [ ] Backlog de validação manual pós-refatoração visual em `refatoracao/pages/*.md` — checkboxes
      não marcados ali continuam pendentes.

### Cosmético / não bloqueante
- [ ] `refatoracao/*.md` ainda referencia caminhos com prefixo `v2/` antigo (histórico de auditoria
      congelado no tempo — não vale reescrever).

## Quality gates
- [ ] Testes passando
- [ ] `/davi-core:review` aprovado (inclui security)
- [ ] Verificado de ponta a ponta — UI: `/davi-ux:verify-ui` com screenshot; API: chamada real
- [ ] `/davi-core:retro` ao concluir — aprendizados registrados

## Notas
- Checklist criado a pedido do usuário, consolidando pendências identificadas durante a
  reorganização de `v2/` → raiz e a divisão dos commits pendentes em 2026-07-20.
