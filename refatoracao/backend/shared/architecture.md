# Backend — Arquitetura Geral

> Atualizado em: 2026-04-02

---

## 1. Stack e configuração global

| Item | Valor |
|---|---|
| Framework | NestJS 11 com Express |
| ORM | Prisma 7 + PostgreSQL 16 |
| Auth | JWT access (15m) + refresh (7d, SHA256 no banco) |
| Hash de senha | bcrypt 12 rounds |
| WebSocket | Socket.io via `@WebSocketGateway` |
| Upload | Multer |
| Validação | class-validator + class-transformer |
| Prefixo global | `/api` |
| Porta | 3001 |

**`main.ts`:**
- `ValidationPipe` global com `whitelist: true, transform: true`
- `cookie-parser` registrado globalmente
- Arquivos estáticos servidos dinamicamente via path configurável por env
- CORS configurado por env

---

## 2. Estrutura de módulos (18 módulos)

```
AppModule
├── PrismaModule           — serviço de acesso ao banco
├── AuthModule             — login, refresh, logout
├── UsersModule            — CRUD de usuários
├── CategoriesModule       — CRUD de categorias
├── LinksModule            — CRUD de links
├── NotesModule            — CRUD de notas
├── UploadedSchedulesModule — CRUD de documentos
├── UploadsModule          — upload de arquivos (Multer)
├── SharesModule           — compartilhamentos
├── BackupsModule          — exportação + BackupScheduler
├── ResetsModule           — reset seletivo de dados
├── FavoritesModule        — favoritos
├── PermissionsModule      — gerenciamento de permissões de role
├── SystemConfigModule     — configurações do sistema
├── NotificationsModule    — notificações + WebSocket Gateway
├── HealthModule           — endpoint de health check
├── BootstrapModule        — seed de SUPERADMIN, permissões e config
└── PublicModule           — endpoints públicos (sem auth)
```

---

## 3. Padrão de camadas

Não há camada de repositório. O fluxo é direto:

```
Controller → Service → PrismaService
```

Isso é simples e funciona bem para este projeto. A única consequência é que os serviços acumulam lógica de acesso ao banco diretamente — o que é aceitável enquanto a lógica de negócio permanecer nos serviços e não nos controllers.

---

## 4. Autenticação e autorização

### Fluxo de login
1. `POST /api/auth/login` → `AuthService.login()`
2. Verifica `UserStatus.ACTIVE`
3. `bcrypt.compare()` contra `passwordHash`
4. Emite `accessToken` (JWT 15m) + `refreshToken` (JWT 7d)
5. Persiste `SHA256(refreshToken)` + `expiresAt` na tabela `RefreshToken`

### Fluxo de refresh
1. `POST /api/auth/refresh` (refreshToken no cookie)
2. `jwtService.verifyAsync()` com `JWT_REFRESH_SECRET`
3. Busca `SHA256(refreshToken)` no banco, verifica `revokedAt` e `expiresAt`
4. Revoga o token atual (`revokedAt = now`)
5. Emite novo par de tokens

### Guards disponíveis

| Guard | Decorator | Comportamento |
|---|---|---|
| `JwtAuthGuard` | `@UseGuards(JwtAuthGuard)` | Valida JWT no header Authorization |
| `OptionalJwtAuthGuard` | `@UseGuards(OptionalJwtAuthGuard)` | Passa mesmo sem token (user = undefined) |
| `RolesGuard` | `@Roles(UserRole.SUPERADMIN)` | Verifica role do usuário autenticado |
| `PermissionsGuard` | `@Permissions('perm')` | Verifica permissões via `PermissionsService` |

### Decorators

- `@CurrentUser()` — param decorator que extrai `req.user` do contexto
- `@Roles(...roles)` — metadata para `RolesGuard`
- `@Permissions(...perms)` — metadata para `PermissionsGuard`

---

## 5. Modelos Prisma (14 modelos)

| Modelo | Descrição |
|---|---|
| `User` | Usuário com role (SUPERADMIN/USER) e status |
| `RolePermission` | Mapa de permissões por role |
| `RefreshToken` | Hash SHA256 dos refresh tokens ativos |
| `Category` | Categoria pertencente a um usuário |
| `Link` | Conteúdo tipo link |
| `UploadedSchedule` | Conteúdo tipo documento (arquivo) |
| `Note` | Conteúdo tipo nota |
| `UploadedImage` | Imagem enviada pelo admin |
| `Share` | Compartilhamento de conteúdo entre usuários |
| `Notification` | Notificação para usuário |
| `Favorite` | Favorito de um usuário para um conteúdo |
| `LinkVersion` | Histórico de versões de links |
| `ActivityLog` | Log de atividade do usuário |
| `AuditLog` | Log de auditoria de operações admin |
| `SystemConfig` | Pares chave/valor de configuração do sistema |

**Padrão de soft delete:** `deletedAt: DateTime?` nos modelos de conteúdo (Link, Note, UploadedSchedule). `deletedAt: null` = item ativo/recuperável.

**Padrão de status:** `EntityStatus` enum (`ACTIVE` / `INACTIVE`) em todos os conteúdos.

**Padrão de visibilidade:** `ContentVisibility` enum (`PUBLIC` / `PRIVATE`). Conteúdo público exige `publicToken` para acesso sem autenticação.

---

## 6. WebSocket Gateway

- `NotificationsGateway` em `notifications/notifications.gateway.ts`
- Autenticação via JWT no evento `connection`
- Mantém `Map<userId, Set<socketId>>` para emissão direcionada
- Métodos: `emitToUser(userId, event, data)`, `emitToUsers(userIds, event, data)`, `isUserOnline(userId)`
- Usado por serviços que emitem notificações em tempo real (ex.: compartilhamentos)

---

## 7. Bootstrap

`BootstrapService` executa no start da aplicação:
1. Upsert do usuário SUPERADMIN (credenciais via env)
2. Upsert de todas as `RolePermission` definidas estaticamente
3. Upsert de todos os valores padrão de `SystemConfig`

Isso garante que o banco nunca inicie em estado inconsistente.
