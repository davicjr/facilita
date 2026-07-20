# Guia de Migração - Relacionamentos Many-to-Many

## O que mudou?

### Antes (1:N - One-to-Many)
- Um setor pertencia a **UMA** unidade apenas
- Um usuário pertencia a **UM** setor apenas
- Problema: TI de um complexo hospitalar precisava de 4 setores separados (um por unidade)

### Agora (N:N - Many-to-Many)
- ✅ Um setor pode estar vinculado a **MÚLTIPLAS** unidades
- ✅ Um usuário pode pertencer a **MÚLTIPLOS** setores
- ✅ Links aparecem baseados em **TODOS** os setores do usuário
- ✅ Campos extras: `isPrimary` (setor/unidade principal) e `role` (permissão por setor)

## Novas Tabelas

### `SectorUnit` (Setores ↔ Unidades)
```prisma
model SectorUnit {
  id        String   @id @default(uuid())
  sectorId  String   // ID do setor
  unitId    String   // ID da unidade
  isPrimary Boolean  @default(false) // Unidade principal do setor
  createdAt DateTime
  updatedAt DateTime
}
```

### `UserSector` (Usuários ↔ Setores)
```prisma
model UserSector {
  id        String     @id @default(uuid())
  userId    String     // ID do usuário
  sectorId  String     // ID do setor
  isPrimary Boolean    @default(false) // Setor principal do usuário
  role      SectorRole @default(MEMBER) // OWNER, ADMIN, MEMBER, VIEWER
  createdAt DateTime
  updatedAt DateTime
}
```

## Campos Removidos
- ❌ `Sector.unitId` - Agora usa `SectorUnit`
- ❌ `User.unitId` - Removido
- ❌ `User.sectorId` - Agora usa `UserSector`

## Como Resetar o Banco de Dados

### Opção 1: Reset completo (APAGA TUDO)

```bash
cd v2/backend

# 1. Apagar migrations antigas
rm -rf prisma/migrations

# 2. Resetar banco (isso APAGA TODOS OS DADOS)
npx prisma migrate reset --force

# 3. Criar nova migration inicial
npx prisma migrate dev --name init

# 4. (Opcional) Popular com dados de seed
npm run prisma:generate
```

### Opção 2: Manual via PostgreSQL

```sql
-- ATENÇÃO: Isso apaga TODOS os dados!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Depois execute:
```bash
cd v2/backend
npx prisma migrate dev --name init
```

## Exemplos de Uso

### Criar um Setor vinculado a múltiplas unidades

```typescript
// Criar setor de TI compartilhado
const sector = await prisma.sector.create({
  data: {
    name: 'TI',
    companyId: 'company-uuid',
    sectorUnits: {
      create: [
        { unitId: 'unidade-1-uuid', isPrimary: true },
        { unitId: 'unidade-2-uuid' },
        { unitId: 'unidade-3-uuid' },
        { unitId: 'unidade-4-uuid' },
      ]
    }
  }
});
```

### Criar usuário com múltiplos setores

```typescript
const user = await prisma.user.create({
  data: {
    name: 'João da TI',
    email: 'joao@hospital.com',
    passwordHash: '...',
    companyId: 'company-uuid',
    userSectors: {
      create: [
        {
          sectorId: 'ti-uuid',
          isPrimary: true,
          role: 'ADMIN'
        },
        {
          sectorId: 'rh-uuid',
          role: 'VIEWER'
        },
      ]
    }
  }
});
```

### Buscar links de todos os setores do usuário

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    userSectors: {
      include: {
        sector: {
          include: {
            links: true
          }
        }
      }
    }
  }
});

// Todos os links dos setores do usuário
const allLinks = user.userSectors.flatMap(us => us.sector.links);
```

## Próximos Passos

Após resetar o banco:

1. ✅ Schema atualizado
2. ⏳ Atualizar DTOs (create/update)
3. ⏳ Modificar services (sectors, users, links)
4. ⏳ Atualizar controllers
5. ⏳ Testar endpoints

## Observações

- **BACKUP**: Certifique-se de ter backup se houver dados importantes
- **Development only**: Este reset é ideal para ambiente de desenvolvimento
- **Seed data**: Considere criar um arquivo de seed com dados de teste
