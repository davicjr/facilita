# Facilita

Portal interno de links, notas e documentos, com categorias, compartilhamento entre usuários,
favoritos, busca global, chat em tempo real e administração centralizada.

## O que faz

- **Portal de conteúdo** — links, notas e agendas/documentos organizados por categoria, com
  upload de imagens e arquivos, soft delete e restauração.
- **Compartilhamento e permissões** — compartilhamento de conteúdo entre usuários, sistema de
  amigos, permissões granulares por role (SUPERADMIN/USER), busca global entre todos os tipos
  de conteúdo.
- **Chat em tempo real** — conversas diretas e em grupo via WebSocket (Socket.io), com
  notificações in-app.
- **Administração** — backup/restore de dados, reset seletivo, configurações do sistema
  (atalhos, backups automáticos), painel de usuários e permissões.

## Stack

NestJS 11 · Prisma 7 · PostgreSQL · Socket.io · JWT — Next.js 16 (App Router) · React 19 ·
Zustand · Tailwind CSS 4 — Docker Compose + Nginx

## Rodar localmente

```bash
cp .env.example .env   # ajuste os secrets antes de subir
docker compose up -d
```

- Frontend: http://localhost (via Nginx)
- Backend: http://localhost:3001/api

Testes do backend (`cd backend`): `npm test` (unitários, sem banco) · `npm run test:e2e`
(precisa de um banco de teste dedicado — ver `CLAUDE.md`).

---

Documentação completa (estrutura, convenções, peculiaridades do projeto) em `CLAUDE.md`.
