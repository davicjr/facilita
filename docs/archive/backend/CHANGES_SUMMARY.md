# Resumo das Mudanças - Relacionamentos Many-to-Many

## Arquivos Modificados

### 1. Schema do Prisma
**Arquivo:** [prisma/schema.prisma](prisma/schema.prisma)

#### Novas Enums
```prisma
enum SectorRole {
  OWNER   // Dono do setor
  ADMIN   // Administrador do setor
  MEMBER  // Membro padrão
  VIEWER  // Apenas visualização
}
```

#### Modelos Atualizados

**Unit:**
- ❌ Removido: relacionamento direto `sectors Sector[]` e `users User[]`
- ✅ Adicionado: `sectorUnits SectorUnit[]`

**Sector:**
- ❌ Removido: campo `unitId` (agora opcional apenas para backward compatibility)
- ❌ Removido: relacionamento direto `users User[]`
- ✅ Adicionado: `sectorUnits SectorUnit[]`
- ✅ Adicionado: `userSectors UserSector[]`

**User:**
- ❌ Removido: campos `unitId` e `sectorId`
- ✅ Adicionado: `userSectors UserSector[]`

#### Novas Tabelas de Junção

**SectorUnit** (linhas 433-447):
```prisma
model SectorUnit {
  id        String   @id @default(uuid())
  sectorId  String   // Setor vinculado
  unitId    String   // Unidade vinculada
  isPrimary Boolean  @default(false) // Unidade principal do setor
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  sector Sector @relation(..., onDelete: Cascade)
  unit   Unit   @relation(..., onDelete: Cascade)

  @@unique([sectorId, unitId])
}
```

**UserSector** (linhas 451-466):
```prisma
model UserSector {
  id        String     @id @default(uuid())
  userId    String     // Usuário vinculado
  sectorId  String     // Setor vinculado
  isPrimary Boolean    @default(false) // Setor principal do usuário
  role      SectorRole @default(MEMBER) // Papel no setor
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  user   User   @relation(..., onDelete: Cascade)
  sector Sector @relation(..., onDelete: Cascade)

  @@unique([userId, sectorId])
}
```

---

### 2. DTOs Atualizados

#### Sectors DTOs

**[src/sectors/dto/create-sector.dto.ts](src/sectors/dto/create-sector.dto.ts)**

Antes:
```typescript
export class CreateSectorDto {
  @IsUUID()
  unitId!: string; // Apenas uma unidade

  @IsString()
  name!: string;
}
```

Agora:
```typescript
export class SectorUnitDto {
  @IsUUID()
  unitId!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateSectorDto {
  @IsArray()
  @ValidateNested({ each: true })
  units!: SectorUnitDto[]; // Array de unidades

  @IsString()
  name!: string;
}
```

**[src/sectors/dto/update-sector.dto.ts](src/sectors/dto/update-sector.dto.ts)**
- Mesma estrutura, mas todos os campos são opcionais

#### Users DTOs

**[src/users/dto/create-user.dto.ts](src/users/dto/create-user.dto.ts)**

Antes:
```typescript
export class CreateUserDto {
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsUUID()
  sectorId?: string; // Apenas um setor
}
```

Agora:
```typescript
export class UserSectorDto {
  @IsUUID()
  sectorId!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsEnum(SectorRole)
  role?: SectorRole;
}

export class CreateUserDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  sectors?: UserSectorDto[]; // Array de setores
}
```

**[src/users/dto/update-user.dto.ts](src/users/dto/update-user.dto.ts)**
- Mesma estrutura, mas todos os campos são opcionais

---

### 3. Services Atualizados

#### Sectors Service

**[src/sectors/sectors.service.ts](src/sectors/sectors.service.ts)**

**findAll() e findById():**
```typescript
include: {
  company: true,
  sectorUnits: {
    include: {
      unit: true,
    },
  },
}
```

**create():**
```typescript
return this.prisma.sector.create({
  data: {
    companyId: data.companyId,
    name: data.name,
    sectorUnits: {
      create: data.units.map((unit) => ({
        unitId: unit.unitId,
        isPrimary: unit.isPrimary ?? false,
      })),
    },
  },
  include: { company: true, sectorUnits: { include: { unit: true } } },
});
```

**update():**
```typescript
if (data.units) {
  updateData.sectorUnits = {
    deleteMany: {}, // Remove todos os antigos
    create: data.units.map((unit) => ({
      unitId: unit.unitId,
      isPrimary: unit.isPrimary ?? false,
    })),
  };
}
```

**getDependencies():**
```typescript
const [users, units, links, schedules, notes] = await Promise.all([
  this.prisma.userSector.count({ where: { sectorId: id } }),
  this.prisma.sectorUnit.count({ where: { sectorId: id } }),
  // ...
]);
```

---

#### Users Service

**[src/users/users.service.ts](src/users/users.service.ts)**

**userSelect atualizado:**
```typescript
const userSelect = {
  id: true,
  name: true,
  // ... outros campos
  userSectors: {
    include: {
      sector: {
        include: {
          sectorUnits: {
            include: {
              unit: true,
            },
          },
        },
      },
    },
  },
};
```

**create():**
```typescript
return this.prisma.user.create({
  data: {
    name: data.name,
    email: data.username,
    // ...
    userSectors: data.sectors
      ? {
          create: data.sectors.map((sector) => ({
            sectorId: sector.sectorId,
            isPrimary: sector.isPrimary ?? false,
            role: sector.role ?? 'MEMBER',
          })),
        }
      : undefined,
  },
});
```

**update():**
```typescript
if (data.sectors) {
  updateData.userSectors = {
    deleteMany: {}, // Remove todos os antigos
    create: data.sectors.map((sector) => ({
      sectorId: sector.sectorId,
      isPrimary: sector.isPrimary ?? false,
      role: sector.role ?? 'MEMBER',
    })),
  };
}
```

---

#### Links Service

**[src/links/links.service.ts](src/links/links.service.ts)**

**findAll() atualizado:**
```typescript
async findAll(
  companyId?: string,
  filters?: {
    sectorId?: string;
    sectorIds?: string[]; // NOVO: múltiplos setores
    // ...
  },
) {
  const sectorFilter = filters?.sectorIds
    ? { sectorId: { in: filters.sectorIds } }
    : filters?.sectorId
    ? { sectorId: filters.sectorId }
    : {};

  const where = {
    deletedAt: null,
    ...sectorFilter,
    // ...
  };
}
```

**Novo método helper:**
```typescript
async findAllByUser(userId: string, companyId?: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      userSectors: {
        select: { sectorId: true },
      },
    },
  });

  const sectorIds = user.userSectors.map((us) => us.sectorId);

  return this.findAll(companyId, {
    sectorIds: sectorIds.length > 0 ? sectorIds : undefined,
  });
}
```

---

#### Notifications Service

**[src/notifications/notifications.service.ts](src/notifications/notifications.service.ts)**

**getRecipientsByAudience() atualizado:**
```typescript
case ContentAudience.SECTOR:
  if (sectorId) {
    // Busca usuários através da tabela UserSector
    where.userSectors = {
      some: {
        sectorId: sectorId,
      },
    };
  } else {
    where.companyId = companyId;
  }
  break;
```

---

## Como Usar as Novas Funcionalidades

### 1. Criar um Setor com Múltiplas Unidades

**Request:**
```json
POST /sectors
{
  "companyId": "uuid-da-empresa",
  "name": "TI - Tecnologia da Informação",
  "description": "Setor de TI do complexo hospitalar",
  "units": [
    {
      "unitId": "uuid-unidade-1",
      "isPrimary": true
    },
    {
      "unitId": "uuid-unidade-2"
    },
    {
      "unitId": "uuid-unidade-3"
    },
    {
      "unitId": "uuid-unidade-4"
    }
  ]
}
```

**Response:**
```json
{
  "id": "uuid-do-setor",
  "name": "TI - Tecnologia da Informação",
  "company": { ... },
  "sectorUnits": [
    {
      "id": "uuid-1",
      "unitId": "uuid-unidade-1",
      "isPrimary": true,
      "unit": {
        "id": "uuid-unidade-1",
        "name": "Hospital Central"
      }
    },
    {
      "id": "uuid-2",
      "unitId": "uuid-unidade-2",
      "isPrimary": false,
      "unit": {
        "id": "uuid-unidade-2",
        "name": "Pronto Socorro"
      }
    },
    // ...
  ]
}
```

### 2. Criar Usuário com Múltiplos Setores

**Request:**
```json
POST /users
{
  "name": "João Silva",
  "username": "joao.silva@hospital.com",
  "password": "senha123",
  "companyId": "uuid-da-empresa",
  "sectors": [
    {
      "sectorId": "uuid-setor-ti",
      "isPrimary": true,
      "role": "ADMIN"
    },
    {
      "sectorId": "uuid-setor-rh",
      "role": "VIEWER"
    },
    {
      "sectorId": "uuid-setor-financeiro",
      "role": "MEMBER"
    }
  ]
}
```

**Response:**
```json
{
  "id": "uuid-do-usuario",
  "name": "João Silva",
  "email": "joao.silva@hospital.com",
  "userSectors": [
    {
      "id": "uuid-1",
      "sectorId": "uuid-setor-ti",
      "isPrimary": true,
      "role": "ADMIN",
      "sector": {
        "id": "uuid-setor-ti",
        "name": "TI",
        "sectorUnits": [
          {
            "unit": {
              "id": "uuid-unidade-1",
              "name": "Hospital Central"
            }
          }
        ]
      }
    },
    // ...
  ]
}
```

### 3. Buscar Links de Todos os Setores do Usuário

**Request:**
```typescript
// No service ou controller
const links = await linksService.findAllByUser(userId, companyId);
```

**Ou via query params (múltiplos setores):**
```typescript
const userSectorIds = ['uuid-setor-1', 'uuid-setor-2', 'uuid-setor-3'];
const links = await linksService.findAll(companyId, {
  sectorIds: userSectorIds
});
```

---

## Vantagens da Nova Estrutura

✅ **Um setor pode servir múltiplas unidades**
- Exemplo: Setor de TI único para todo o complexo hospitalar

✅ **Um usuário pode ter acesso a múltiplos setores**
- Com diferentes níveis de permissão (OWNER, ADMIN, MEMBER, VIEWER)

✅ **Links aparecem baseados em todos os setores do usuário**
- Usuário vê conteúdo de todos os setores que tem acesso

✅ **Flexibilidade de permissões**
- `isPrimary`: Identifica setor/unidade principal
- `role`: Permissões específicas por setor (SectorRole)

✅ **Notificações inteligentes**
- Sistema notifica todos os usuários de um setor automaticamente

---

## Próximos Passos

1. **Resetar o banco de dados** (veja [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md))
2. **Testar criação de setores com múltiplas unidades**
3. **Testar criação de usuários com múltiplos setores**
4. **Verificar se links aparecem corretamente baseados nos setores do usuário**
5. **Testar notificações**

---

## Arquivos para Referência

- ✅ [prisma/schema.prisma](prisma/schema.prisma) - Schema atualizado
- ✅ [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Guia para resetar o banco
- ✅ [src/sectors/sectors.service.ts](src/sectors/sectors.service.ts)
- ✅ [src/users/users.service.ts](src/users/users.service.ts)
- ✅ [src/links/links.service.ts](src/links/links.service.ts)
- ✅ [src/notifications/notifications.service.ts](src/notifications/notifications.service.ts)
