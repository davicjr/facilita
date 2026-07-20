# Backend — Padrões Repetidos e Duplicações

> Arquivos envolvidos:
> - `v2/backend/src/links/links.service.ts`
> - `v2/backend/src/notes/notes.service.ts`
> - `v2/backend/src/uploaded-schedules/uploaded-schedules.service.ts`
> - `v2/backend/src/links/links.controller.ts`
> - `v2/backend/src/notes/notes.controller.ts`
> - `v2/backend/src/uploaded-schedules/uploaded-schedules.controller.ts`
> - `v2/backend/src/links/dto/create-link.dto.ts`
> - `v2/backend/src/notes/dto/create-note.dto.ts`
> - `v2/backend/src/uploaded-schedules/dto/create-schedule.dto.ts`
> Atualizado em: 2026-04-02

---

## 1. Resumo executivo

Os três módulos de conteúdo (Links, Notes, UploadedSchedules) são **cópias quase idênticas** entre si. Os métodos privados são literalmente copy-paste. Os métodos públicos de CRUD são estruturalmente idênticos, diferindo apenas no nome do modelo Prisma. Os controllers têm a mesma estrutura de rotas, guards e injeção de dependências. Os DTOs compartilham os mesmos campos opcionais.

**Volume estimado de duplicação:**
- Serviços: ~400 linhas em cada × 3 = ~1.200 linhas, das quais ~900 são duplicação
- Controllers: ~100 linhas em cada × 3 = ~300 linhas, das quais ~250 são duplicação
- DTOs: ~40 linhas duplicadas de campos comuns

**Nível de prioridade:** Alta — é o problema mais impactante do backend

---

## 2. Métodos privados 100% duplicados nos três serviços

Estes cinco métodos existem **literalmente idênticos** em `LinksService`, `NotesService` e `UploadedSchedulesService`:

### `withShareMetadata<T>(item)`

```typescript
private withShareMetadata<T extends { owner: any; shares?: any[] }>(item: T) {
  const shares = item.shares ?? [];
  return {
    ...item,
    createdBy: item.owner,
    shareCount: shares.length,
    sharedWithPreview: shares.slice(0, 5).map((s) => s.recipient),
  };
}
```

### `normalizeVisibility(actorRole, requested?)`

```typescript
private normalizeVisibility(actorRole: UserRole, requested?: ContentVisibility) {
  if (actorRole === UserRole.SUPERADMIN) return requested ?? ContentVisibility.PRIVATE;
  return ContentVisibility.PRIVATE;
}
```

### `ensurePublicToken(visibility, provided?)`

```typescript
private ensurePublicToken(visibility: ContentVisibility, provided?: string | null) {
  if (visibility !== ContentVisibility.PUBLIC) return null;
  return provided?.trim() || randomUUID();
}
```

### `assertCategoryOwner(categoryId, ownerId)`

```typescript
private async assertCategoryOwner(categoryId: string | null | undefined, ownerId: string) {
  if (!categoryId) return;
  const category = await this.prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, ownerId: true },
  });
  if (!category || category.ownerId !== ownerId) {
    throw new ForbiddenException('Category not authorized');
  }
}
```

### `assertCanMutate(item, actor)`

```typescript
private assertCanMutate(item: { ownerId: string }, actor: { id: string; role: UserRole }) {
  if (actor.role === UserRole.SUPERADMIN) return;
  if (actor.id !== item.ownerId) {
    throw new ForbiddenException('Document not authorized');
  }
}
```

---

## 3. Padrão estrutural duplicado nos métodos públicos

Os métodos `create`, `findAll`, `findAllPaginated`, `findOne`, `findPublicByToken`, `update`, `remove`, `restore`, `activate`, `deactivate` seguem a **mesma lógica** nos três serviços. A única diferença é o modelo Prisma usado:

| Links | Notes | Schedules |
|---|---|---|
| `prisma.link` | `prisma.note` | `prisma.uploadedSchedule` |
| `Prisma.LinkInclude` | `Prisma.NoteInclude` | `Prisma.UploadedScheduleInclude` |

Os campos específicos de cada entidade (ex.: `url` em Link, `content` em Note, `fileUrl/fileName/fileSize` em Schedule) só aparecem no `create()` e `update()` — o restante da lógica é idêntico.

---

## 4. Duplicação em `activate` e `deactivate`

Os três serviços têm dois métodos que são praticamente iguais entre si dentro do mesmo serviço:

```typescript
async activate(id, actor) {
  // findUnique, assertCanMutate, update com { status: ACTIVE }
}

async deactivate(id, actor) {
  // findUnique, assertCanMutate, update com { status: INACTIVE }
}
```

Esses dois métodos poderiam ser um único método `setStatus(id, actor, status: EntityStatus)`. Isso eliminaria ~30 linhas duplicadas em cada serviço.

---

## 5. DTOs com campos opcionais duplicados

Os três DTOs de criação compartilham os mesmos campos opcionais de "conteúdo visual e de visibilidade":

| Campo | CreateLinkDto | CreateNoteDto | CreateScheduleDto |
|---|---|---|---|
| `color` | ✓ | ✓ | ✓ |
| `imageUrl` | ✓ | ✓ | ✓ |
| `imagePosition` | ✓ | ✓ | ✓ |
| `imageScale` | ✓ | ✓ | ✓ |
| `categoryId` | ✓ | ✓ | ✓ |
| `visibility` | ✓ | ✓ | ✓ |
| `publicToken` | ✓ | ✓ | ✓ |
| `status` | ✓ | ✓ | ✓ |

Esses 8 campos são idênticos nos três DTOs. Uma classe base `BaseContentDto` poderia consolidá-los.

---

## 6. Controllers com estrutura idêntica

Os três controllers têm as mesmas rotas, guards e decorators:

```
POST   /                     → create (JwtAuthGuard)
GET    /                     → findAll (OptionalJwtAuthGuard)
GET    /admin/list           → findAllPaginated (JwtAuthGuard + Roles SUPERADMIN)
GET    /admin                → alias de /admin/list
GET    /:id                  → findOne (OptionalJwtAuthGuard)
PATCH  /:id                  → update (JwtAuthGuard)
DELETE /:id                  → remove (JwtAuthGuard)
POST   /:id/restore          → restore (JwtAuthGuard)
POST   /:id/activate         → activate (JwtAuthGuard)
POST   /:id/deactivate       → deactivate (JwtAuthGuard)
```

A diferença entre os controllers é somente o serviço injetado e o prefixo de rota. A lógica de extração de `@CurrentUser()`, parsing de query params e chamadas ao serviço é a mesma.

---

## 7. Plano de refatoração

### Etapa 1 — Extrair `ContentHelpers` (serviço compartilhado)

Criar `v2/backend/src/common/services/content-helpers.service.ts` com os cinco métodos privados que hoje estão duplicados:

```typescript
@Injectable()
export class ContentHelpersService {
  constructor(private readonly prisma: PrismaService) {}

  withShareMetadata<T extends { owner: any; shares?: any[] }>(item: T) { ... }
  normalizeVisibility(actorRole: UserRole, requested?: ContentVisibility) { ... }
  ensurePublicToken(visibility: ContentVisibility, provided?: string | null) { ... }
  async assertCategoryOwner(categoryId: string | null | undefined, ownerId: string) { ... }
  assertCanMutate(item: { ownerId: string }, actor: { id: string; role: UserRole }) { ... }
}
```

Registrar em `CommonModule` e importar nos três módulos de conteúdo.

**Impacto:** Remove ~100 linhas de duplicação pura (5 métodos × ~20 linhas × 3 serviços = ~300 linhas → ~100 linhas no helper).

### Etapa 2 — Unificar `activate` e `deactivate` em `setStatus`

Em cada um dos três serviços, substituir os dois métodos por um único:

```typescript
async setStatus(id: string, actor: { id: string; role: UserRole }, status: EntityStatus) {
  const existing = await this.prisma.[model].findUnique({ where: { id }, include: this.include });
  if (!existing || existing.deletedAt) throw new NotFoundException(...);
  this.helpers.assertCanMutate(existing, actor);
  const updated = await this.prisma.[model].update({
    where: { id },
    data: { status },
    include: this.include,
  });
  return this.helpers.withShareMetadata(updated);
}
```

Nos controllers, as rotas `/activate` e `/deactivate` continuam existindo mas delegam para `setStatus(id, actor, EntityStatus.ACTIVE)` e `setStatus(id, actor, EntityStatus.INACTIVE)`.

**Impacto:** Remove ~30 linhas em cada serviço (90 linhas total).

### Etapa 3 — Extrair `BaseContentDto`

Criar `v2/backend/src/common/dto/base-content.dto.ts`:

```typescript
export class BaseContentDto {
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() imagePosition?: string;
  @IsOptional() @IsNumber() imageScale?: number;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsEnum(ContentVisibility) visibility?: ContentVisibility;
  @IsOptional() @IsString() publicToken?: string;
  @IsOptional() @IsEnum(EntityStatus) status?: EntityStatus;
}
```

Cada DTO de criação passa a extender `BaseContentDto` e declara apenas os campos específicos da entidade.

**Impacto:** Remove ~40 linhas de declarações duplicadas de campos.

---

## 8. Ordem recomendada de implementação

1. **Etapa 1 primeiro** — ContentHelpersService é o maior ganho e não altera interfaces públicas
2. **Etapa 3 depois** — BaseContentDto é simples e não tem riscos
3. **Etapa 2 por último** — setStatus altera assinatura de método e precisa de atualização coordenada nos controllers

---

## 9. Riscos e cuidados

| Risco | Probabilidade | Mitigação |
|---|---|---|
| `assertCategoryOwner` em ContentHelpersService precisar de `PrismaService` → circular dependency se PrismaModule não for global | Baixa | `PrismaModule` já é `@Global()` no projeto |
| Controllers ainda referenciarem `activate()`/`deactivate()` após renomear para `setStatus()` | Baixa | Atualizar controller junto com o serviço no mesmo commit |
| `BaseContentDto` herdado por UpdateDto criar problemas de `@IsOptional` vs campos obrigatórios no Create | Nenhuma | Os campos em BaseContentDto já são todos opcionais |
