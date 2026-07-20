# Mapa de credenciais

Inventário de toda credencial/segredo usado pelo projeto: onde vive, quem emite, quem rotaciona.
Nunca colocar valores reais aqui — só nome, propósito e processo.

| Variável | Onde vive | Emitida por | Rotaciona quando | Usada por |
|---|---|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | `.env` (raiz) | Quem sobe o ambiente (`openssl rand -hex 24` ou similar) | Suspeita de vazamento, ou rotina de segurança do host | Container `db`, `DATABASE_URL` do backend |
| `JWT_ACCESS_SECRET` | `.env` (raiz) | Gerado localmente (hex aleatório, 32+ bytes) | Suspeita de vazamento — invalida todos os access tokens ativos | `AuthModule` (assinatura/verificação de access token) |
| `JWT_REFRESH_SECRET` | `.env` (raiz) | Gerado localmente (hex aleatório, 32+ bytes) | Suspeita de vazamento — invalida todos os refresh tokens ativos (todo mundo precisa logar de novo) | `AuthModule` (assinatura/verificação de refresh token) |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` | `.env` (raiz) | Definida na primeira subida do `BootstrapService` (só cria se não existir usuário) | Após primeiro login em produção — trocar pela UI de perfil, não só no `.env` (o `.env` só vale pro bootstrap inicial) | `BootstrapService` (seed do primeiro SUPERADMIN) |
| `DATABASE_URL` (dentro de `backend/.env`) | `backend/.env` | Espelha `POSTGRES_*` da raiz, mas aponta pra `localhost`/`127.0.0.1` — só usado rodando o backend **fora** do Docker (`npm run start:dev`) | Junto com `POSTGRES_PASSWORD` | Prisma Client em dev local |
| `CORS_ORIGIN` | `.env` / `.env.production` | Definido manualmente por quem configura o ambiente (domínio real do frontend) | Ao trocar de domínio/subdomínio do frontend | `buildCorsOptions` (`backend/src/common/utils/cors.ts`), falha o boot se vazio |
| `COOKIE_SECURE` / `COOKIE_DOMAIN` | `.env` / `.env.production` | Manual, depende do ambiente (HTTPS ou não, domínio) | Ao mudar de HTTP pra HTTPS ou de domínio | Cookies de refresh token |
| Certificado TLS (ainda não existe) | N/A — pendente, ver checklist `pendencias-producao-novo-repo.md` | Autoridade certificadora (Let's Encrypt/similar) no ambiente de produção real | Conforme validade do certificado (Let's Encrypt: 90 dias, geralmente automatizado) | `nginx` (`listen 443 ssl`, ainda não configurado) |

## Regras gerais

- Nenhum `.env*` real é versionado — só `.env.example` (raiz e `backend/`), e esses só têm
  placeholders (`change-me`, `ChangeMe123!` etc), nunca valores reais.
- Segredos gerados localmente usam `openssl rand -hex <N>` ou equivalente — nunca senhas
  memorizáveis nem valores reaproveitados entre variáveis diferentes.
- Ao copiar este projeto para o novo repositório (ver `pendencias-producao-novo-repo.md`), gerar
  credenciais **novas** para o ambiente novo — não reaproveitar as deste ambiente de
  desenvolvimento.
