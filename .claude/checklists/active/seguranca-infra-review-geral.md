# Segurança e infra — achados da review geral (área 4/4)

Origem: review geral do projeto (2026-07-19), skills `davi-core:security`,
`davi-backend:input-validation-boundaries`, `davi-pipelines:secrets-credential-hygiene`,
`davi-devops:image-security-hardening`.

Os itens 1 e 2 são severidade **Alta** — usuário confirmou que os secrets são reais de produção,
tratar como vazamento (rotação, não só remoção do git).

## 1. Secrets vazados no histórico do git (parcialmente resolvido — falta produção real e histórico)

`.env`, `backend/.env` e `.env.production` estavam versionados. Ao verificar valor por
valor (não só nome da chave): `.env` (o que o Docker Compose realmente usa) tinha
`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`POSTGRES_PASSWORD` reais; `backend/.env` tinha só
placeholders (`change-me`, `ChangeMe123!`) exceto a senha `admin` hardcoded no `DATABASE_URL`;
`.env.production` tinha JWT reais mas `POSTGRES_PASSWORD=postgres` e
`SUPERADMIN_PASSWORD=ChangeMe123!` triviais.

- [x] `git rm --cached` nos três arquivos + `.gitignore` corrigido (`.env` + `.env.*` com `!.env.example`)
- [x] Rotação local coordenada em `.env` (o que o stack Docker rodando usa): novos
      `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `POSTGRES_PASSWORD` (trocado dentro do Postgres
      já inicializado via `ALTER USER`, testado com nova senha antes de seguir),
      `SUPERADMIN_PASSWORD` (hash atualizado direto no banco — env var sozinha não teria efeito,
      o bootstrap só roda na primeira inicialização). Backend reiniciado e testado: `/api/health`
      200, login com a nova senha do superadmin retornou 201 com o usuário certo.
- [x] `backend/.env` e `.env.production` preenchidos com valores novos gerados (não havia
      nada rodando pra coordenar nesses dois)
- [ ] **`backend/.env`**: a senha nova no `DATABASE_URL` (antes `admin`, apontando pra
      `127.0.0.1:5432`) só funciona se alguém também trocar a senha do usuário `postgres` nesse
      Postgres local específico (fora do Docker) — não sei se esse Postgres existe/roda nesta
      máquina, não tive como coordenar. Verificar antes de rodar `npm run start:dev` fora do Docker.
- [ ] **`.env.production`**: valores novos gerados mas **não aplicados a nenhum servidor
      real** — esse arquivo não representa infraestrutura que esta sessão tem acesso. Se esse
      arquivo já foi usado pra deploy real em algum momento, as credenciais antigas ainda estão
      ativas lá até serem trocadas manualmente no servidor de produção.
- [x] **Confirmado em 2026-07-20**: `.env.example` (raiz e `backend/`) só têm placeholder óbvio
      (`ChangeMe123!`, `change-me`, `your-super-secret-...`) — zero valor real
- [ ] Decidir se vale reescrever o histórico do git pra remover os valores antigos (operação
      destrutiva, requer aprovação explícita separada) ou se a rotação já é suficiente porque os
      valores antigos ficam inúteis
- [ ] Documentar o mapa de credenciais (variável → quem emite → quem rotaciona) — ver skill `secrets-credential-hygiene`

## 2. `CORS_ORIGIN=*` em produção + `credentials: true` = qualquer origem com cookies liberados

`backend/.env` e `.env.production` têm `CORS_ORIGIN=*`. Em `backend/src/main.ts:60-70`,
isso ativa `callback(null, true)` (reflete qualquer origem) com `credentials: true` mantido —
qualquer site pode fazer requisição autenticada com cookies contra a API.

- [x] `main.ts` corrigido: lança erro no boot se `CORS_ORIGIN` não estiver setado (antes
      abria geral silenciosamente); lança erro se `CORS_ORIGIN=*` com `NODE_ENV=production`;
      permite `*` fora de produção mas loga aviso. Rebuild + restart do backend confirmados
      saudáveis (`/api/health` 200) com `CORS_ORIGIN=http://localhost:80` do `.env` local.
- [ ] Definir `CORS_ORIGIN` em `.env.production` com o(s) domínio(s) real(is) do frontend —
      hoje está como placeholder (`CHANGE_ME_TO_REAL_PRODUCTION_DOMAIN`), precisa do domínio real
      antes desse arquivo servir pra deploy de verdade
- [ ] Testar em produção real (fora do alcance desta sessão) que o frontend ainda funciona após
      restringir a origem — e que o boot não falha por causa do novo `throw`

## 3. Nenhum rate limiting em nenhuma rota (inclusive `/auth/login`) — RESOLVIDO

- [x] `@nestjs/throttler` adicionado: 100 req/min global (`app.module.ts`), 5 req/min em
      `/auth/login` e 10 req/min em `/auth/refresh` (`auth.controller.ts`, `@Throttle`)
- [x] Testado: 6ª tentativa de login em 60s retorna `429` (confirmado com 7 chamadas seguidas)
- [x] Rebuild + restart do backend, `/api/health` 200 depois

Nota: a instalação inicial via `npm audit fix` quebrou o build (bump do `prisma` CLI reorganizou
arquivos internos do engine — `query_compiler_fast_bg.postgresql.wasm-base64.js` não encontrado).
Revertido e reinstalado só o `@nestjs/throttler`, isolado. Ver item de `npm audit` abaixo pra o
que ficou pendente disso.

## 4. Containers Docker rodam como root — RESOLVIDO

Os volumes `backend_uploads`, `backend_backups`, `backend_exports` já tinham 4 dias de dados
reais pertencendo a `root:root` — só adicionar `USER node` teria quebrado a escrita nesses
diretórios. Solução: entrypoint que roda como root só pra ajustar a dona dos volumes, depois
troca pro usuário não-root antes de subir a aplicação (padrão usado por imagens oficiais como
postgres/mysql pra esse mesmo problema).

- [x] `backend/docker-entrypoint.sh` criado: `chown -R node:node` em uploads/backups/exports,
      depois `exec gosu node "$@"` (drop de privilégio antes de rodar a app)
- [x] `backend/Dockerfile` — `gosu` instalado, `ENTRYPOINT` apontando pro script
- [x] `frontend/Dockerfile` — `USER node` direto (sem volumes montados, não precisa do entrypoint)
- [x] Rebuild dos dois, restart, verificado via `docker top`: o processo real (`node dist/main.js`)
      roda como uid 1000, não root. `/api/health` 200, frontend 200 via nginx.
- [x] Volumes existentes re-donos automaticamente pelo entrypoint no restart — sem perda de dados

## 5. Nginx sem HSTS/CSP — não implementado nesta sessão, motivo registrado

- [ ] **HSTS**: confirmado em `nginx.conf` que só existe `listen 80` — nenhum TLS configurado.
      Navegador ignora header HSTS recebido via HTTP puro, então adicionar agora é um no-op (na
      melhor das hipóteses) — fica bloqueado até existir TLS de verdade. Não fazer antes disso.
- [ ] **CSP**: precisa de verificação em navegador real (console de erros por violação de
      política) pra não quebrar silenciosamente scripts/estilos do Next.js — esta sessão não tem
      acesso a navegador pra validar. Levantar fontes reais primeiro (`/davi-frontend:accessibility-audit`
      ou inspeção manual do Network tab) e testar com `/davi-ux:verify-ui` antes de aplicar.

## 6. `npm audit` — resultados reais (rodado via containers, correções automáticas parcialmente aplicadas)

**Backend**: 29 vulnerabilidades → 5 depois de `npm audit fix` (sem `--force`). As 5 restantes
exigem `--force`, que rebaixaria `prisma` pra 6.19.3 — downgrade breaking do que o projeto usa
(Prisma 7). **Não apliquei.**

- [x] `npm audit fix` (sem force) aplicado em `backend` — 24 vulnerabilidades corrigidas
      (multer, path-to-regexp, qs, socket.io-parser, uuid, ws e cadeia do engine.io)
- [x] Confirmado: zero linhas do Prisma mudaram no lockfile depois do fix — build e testes ok
- [ ] Decidir sobre as 5 restantes (ajv, fast-uri, via `@prisma/dev`) — exigem `--force` com
      downgrade do Prisma. Avaliar se `@prisma/dev` é sequer necessário em runtime (parece
      ferramenta de Postgres local de desenvolvimento) antes de decidir

**Frontend**: 10 vulnerabilidades → 2 depois de `npm audit fix` (sem `--force`). As 2 restantes
(postcss via next) exigem `--force`, que bumpa `next` 16.1.1 → 16.2.10 "fora do range declarado".
**Tentei aplicar o fix sem force e quebrou o build** (erro de tipo em `response.headers['content-type']`,
provavelmente de uma dependência transitiva do axios que mudou junto) — revertido.

- [x] **Investigado e corrigido em 2026-07-20**: causa raiz era o bump do `axios` mudando o tipo
      de `response.headers['content-type']` pra incluir `null`, incompatível com o parâmetro
      `type` do `Blob` em `download.ts`. Type guard adicionado, `npm audit fix` reaplicado e
      testado (build completo + todas as rotas geradas) antes de aplicar ao lockfile real.
      17 vulnerabilidades → 2 (postcss via next, exigem `--force`).
- [ ] Decidir sobre o bump do Next.js (16.1.1 → 16.2.10, fora do range declarado) pras 2
      vulnerabilidades restantes de postcss — não fiz, é escolha de versão, não correção de bug

**Padrão que se repetiu duas vezes nesta sessão**: mesmo `npm audit fix` sem `--force` alterou
dependências transitivas o suficiente pra quebrar o build (Prisma no backend, tipos do axios no
frontend). Antes de rodar em qualquer outro projeto: sempre rebuildar e testar depois, nunca
assumir que "sem force" é sinônimo de "sem risco".
