# Plano de Migração do Frontend - Relacionamentos Many-to-Many

## 📋 Visão Geral

Este documento mapeia **TODAS** as mudanças necessárias no frontend para suportar a nova estrutura de relacionamentos many-to-many entre Setores, Unidades e Usuários.

## 🎯 O Que Mudou no Backend

### Antes (1:N)
- ❌ Um setor → uma unidade (`sector.unitId`)
- ❌ Um usuário → um setor (`user.sectorId`)

### Agora (N:N)
- ✅ Um setor → **múltiplas unidades** (`sector.sectorUnits[]`)
- ✅ Um usuário → **múltiplos setores** (`user.userSectors[]` com `role` e `isPrimary`)

---

## 📁 Arquivos que PRECISAM ser Modificados

### 1. Types & Interfaces
**Arquivo:** [src/types/index.ts](src/types/index.ts)

#### ❌ Remover

```typescript
export interface Sector {
  id: string;
  companyId: string;
  unitId: string; // ❌ REMOVER
  name: string;
  description?: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  unit?: Unit; // ❌ REMOVER
}

export interface User {
  id: string;
  companyId?: string;
  unitId?: string; // ❌ REMOVER
  sectorId?: string; // ❌ REMOVER
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  // ...
}
```

#### ✅ Adicionar

```typescript
// Nova enum para roles de setor
export type SectorRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

// Nova interface para relacionamento Setor-Unidade
export interface SectorUnit {
  id: string;
  sectorId: string;
  unitId: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  unit: Unit;
}

// Nova interface para relacionamento Usuário-Setor
export interface UserSector {
  id: string;
  userId: string;
  sectorId: string;
  isPrimary: boolean;
  role: SectorRole;
  createdAt: string;
  updatedAt: string;
  sector: Sector & {
    sectorUnits: SectorUnit[];
  };
}

// Atualizar Sector
export interface Sector {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  sectorUnits: SectorUnit[]; // ✅ NOVO
  userSectors?: UserSector[]; // ✅ NOVO
}

// Atualizar User
export interface User {
  id: string;
  companyId?: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  theme?: any;
  createdAt: string;
  updatedAt: string;
  userSectors: UserSector[]; // ✅ NOVO
  company?: Company;
}

// Para AuthUser também
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  companyId?: string;
  avatarUrl?: string;
  theme?: any;
  userSectors: UserSector[]; // ✅ NOVO
}
```

---

### 2. Auth Store
**Arquivo:** [src/stores/auth-store.ts](src/stores/auth-store.ts)

#### ❌ Remover campos antigos

```typescript
interface AuthState {
  user: {
    // ...
    unitId?: string; // ❌ REMOVER
    sectorId?: string; // ❌ REMOVER
  } | null;
}
```

#### ✅ Adicionar

```typescript
interface AuthState {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    companyId?: string;
    userSectors: UserSector[]; // ✅ NOVO
    // ... outros campos
  } | null;
}
```

**Helpers úteis:**

```typescript
// No auth-store.ts ou em um arquivo de utils
export const getUserPrimarySector = (user: AuthUser | null): UserSector | undefined => {
  return user?.userSectors?.find(us => us.isPrimary);
};

export const getUserSectorIds = (user: AuthUser | null): string[] => {
  return user?.userSectors?.map(us => us.sectorId) || [];
};

export const getUserSectorRole = (user: AuthUser | null, sectorId: string): SectorRole | undefined => {
  return user?.userSectors?.find(us => us.sectorId === sectorId)?.role;
};
```

---

### 3. Página de Setores
**Arquivo:** [src/app/(app)/admin/sectors/page.tsx](src/app/(app)/admin/sectors/page.tsx)

#### Mudanças no Formulário (Modal)

**Antes:**
```tsx
<select name="unitId" required>
  <option value="">Selecione uma unidade</option>
  {units
    .filter(u => u.companyId === formData.companyId)
    .map(unit => (
      <option key={unit.id} value={unit.id}>{unit.name}</option>
    ))}
</select>
```

**Depois:**
```tsx
{/* Multi-select de unidades com isPrimary */}
<div className="space-y-2">
  <label className="text-sm font-medium">Unidades *</label>
  {units
    .filter(u => u.companyId === formData.companyId)
    .map(unit => (
      <div key={unit.id} className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`unit-${unit.id}`}
          checked={formData.units?.some(u => u.unitId === unit.id) || false}
          onChange={(e) => {
            const isChecked = e.target.checked;
            setFormData(prev => ({
              ...prev,
              units: isChecked
                ? [...(prev.units || []), { unitId: unit.id, isPrimary: false }]
                : prev.units?.filter(u => u.unitId !== unit.id) || []
            }));
          }}
        />
        <label htmlFor={`unit-${unit.id}`}>{unit.name}</label>
        {formData.units?.some(u => u.unitId === unit.id) && (
          <label className="ml-auto flex items-center gap-1 text-xs">
            <input
              type="radio"
              name="primaryUnit"
              checked={formData.units?.find(u => u.unitId === unit.id)?.isPrimary || false}
              onChange={() => {
                setFormData(prev => ({
                  ...prev,
                  units: prev.units?.map(u => ({
                    ...u,
                    isPrimary: u.unitId === unit.id
                  })) || []
                }));
              }}
            />
            Principal
          </label>
        )}
      </div>
    ))}
  {(!formData.units || formData.units.length === 0) && (
    <p className="text-xs text-red-500">Selecione ao menos uma unidade</p>
  )}
</div>
```

**Estado do formulário:**
```typescript
interface SectorFormData {
  companyId: string;
  units: { unitId: string; isPrimary: boolean }[]; // ✅ NOVO
  name: string;
  description?: string;
  status: EntityStatus;
}

const [formData, setFormData] = useState<SectorFormData>({
  companyId: '',
  units: [], // ✅ NOVO
  name: '',
  description: '',
  status: 'ACTIVE'
});
```

**Ao carregar setor para edição:**
```typescript
const handleEdit = (sector: Sector) => {
  setFormData({
    companyId: sector.companyId,
    units: sector.sectorUnits.map(su => ({
      unitId: su.unitId,
      isPrimary: su.isPrimary
    })),
    name: sector.name,
    description: sector.description || '',
    status: sector.status
  });
  setEditingId(sector.id);
  setIsModalOpen(true);
};
```

#### Mudanças na Exibição (Card)

**Antes:**
```tsx
<p className="text-sm text-muted-foreground">
  {sector.unit?.name || 'N/A'}
</p>
```

**Depois:**
```tsx
<div className="text-sm text-muted-foreground">
  {sector.sectorUnits && sector.sectorUnits.length > 0 ? (
    <>
      <p className="font-medium">Unidades ({sector.sectorUnits.length}):</p>
      <div className="flex flex-wrap gap-1 mt-1">
        {sector.sectorUnits.map(su => (
          <span
            key={su.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
              su.isPrimary
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {su.unit.name}
            {su.isPrimary && <span className="font-semibold">★</span>}
          </span>
        ))}
      </div>
    </>
  ) : (
    <p className="text-xs text-amber-600">Nenhuma unidade vinculada</p>
  )}
</div>
```

---

### 4. Página de Usuários
**Arquivo:** [src/app/(app)/admin/users/page.tsx](src/app/(app)/admin/users/page.tsx)

#### Mudanças no Formulário (Modal)

**Antes:**
```tsx
{/* Dropdown de setor único */}
<select name="sectorId">
  <option value="">Selecione um setor</option>
  {sectors
    .filter(s => s.unitId === formData.unitId)
    .map(sector => (
      <option key={sector.id} value={sector.id}>{sector.name}</option>
    ))}
</select>
```

**Depois:**
```tsx
{/* Multi-select de setores com role e isPrimary */}
<div className="space-y-2">
  <label className="text-sm font-medium">Setores</label>
  <p className="text-xs text-muted-foreground">
    Selecione os setores que o usuário terá acesso
  </p>

  <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2">
    {sectors
      .filter(s => !formData.companyId || s.companyId === formData.companyId)
      .map(sector => {
        const isSelected = formData.sectors?.some(us => us.sectorId === sector.id);
        const selectedSector = formData.sectors?.find(us => us.sectorId === sector.id);

        return (
          <div key={sector.id} className="border rounded p-2 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`sector-${sector.id}`}
                checked={isSelected}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setFormData(prev => ({
                    ...prev,
                    sectors: isChecked
                      ? [...(prev.sectors || []), {
                          sectorId: sector.id,
                          isPrimary: false,
                          role: 'MEMBER' as SectorRole
                        }]
                      : prev.sectors?.filter(s => s.sectorId !== sector.id) || []
                  }));
                }}
              />
              <label htmlFor={`sector-${sector.id}`} className="font-medium flex-1">
                {sector.name}
                <span className="text-xs text-muted-foreground ml-2">
                  ({sector.sectorUnits?.map(su => su.unit.name).join(', ')})
                </span>
              </label>
            </div>

            {isSelected && (
              <div className="ml-6 flex gap-4 items-center">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name="primarySector"
                    checked={selectedSector?.isPrimary || false}
                    onChange={() => {
                      setFormData(prev => ({
                        ...prev,
                        sectors: prev.sectors?.map(s => ({
                          ...s,
                          isPrimary: s.sectorId === sector.id
                        })) || []
                      }));
                    }}
                  />
                  Principal
                </label>

                <select
                  className="text-xs border rounded px-2 py-1"
                  value={selectedSector?.role || 'MEMBER'}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      sectors: prev.sectors?.map(s =>
                        s.sectorId === sector.id
                          ? { ...s, role: e.target.value as SectorRole }
                          : s
                      ) || []
                    }));
                  }}
                >
                  <option value="OWNER">Dono</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="MEMBER">Membro</option>
                  <option value="VIEWER">Visualizador</option>
                </select>
              </div>
            )}
          </div>
        );
      })}
  </div>
</div>
```

**Estado do formulário:**
```typescript
interface UserFormData {
  name: string;
  username: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  companyId?: string;
  sectors?: { sectorId: string; isPrimary: boolean; role: SectorRole }[]; // ✅ NOVO
  avatarUrl?: string;
}

const [formData, setFormData] = useState<UserFormData>({
  name: '',
  username: '',
  password: '',
  role: 'USER',
  status: 'ACTIVE',
  companyId: '',
  sectors: [], // ✅ NOVO
  avatarUrl: ''
});
```

**Ao carregar usuário para edição:**
```typescript
const handleEdit = (user: User) => {
  setFormData({
    name: user.name,
    username: user.email,
    password: '', // Não preencher senha ao editar
    role: user.role,
    status: user.status,
    companyId: user.companyId,
    sectors: user.userSectors?.map(us => ({
      sectorId: us.sectorId,
      isPrimary: us.isPrimary,
      role: us.role
    })) || [],
    avatarUrl: user.avatarUrl
  });
  setEditingId(user.id);
  setIsModalOpen(true);
};
```

#### Mudanças na Exibição (Card)

**Antes:**
```tsx
<p className="text-sm text-muted-foreground">
  {user.company?.name} → {user.unit?.name} → {user.sector?.name}
</p>
```

**Depois:**
```tsx
<div className="text-sm text-muted-foreground space-y-1">
  <p>{user.company?.name || 'Sem empresa'}</p>

  {user.userSectors && user.userSectors.length > 0 ? (
    <div>
      <p className="font-medium text-xs">Setores ({user.userSectors.length}):</p>
      <div className="flex flex-wrap gap-1 mt-1">
        {user.userSectors.map(us => {
          const primaryUnit = us.sector.sectorUnits?.find(su => su.isPrimary);
          const roleLabels = {
            OWNER: 'Dono',
            ADMIN: 'Admin',
            MEMBER: 'Membro',
            VIEWER: 'Visualizador'
          };

          return (
            <span
              key={us.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                us.isPrimary
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700'
              }`}
              title={`${us.sector.name} - ${roleLabels[us.role]}\nUnidade: ${primaryUnit?.unit.name || 'N/A'}`}
            >
              {us.sector.name}
              <span className="text-[10px] opacity-70">({roleLabels[us.role]})</span>
              {us.isPrimary && <span className="font-semibold">★</span>}
            </span>
          );
        })}
      </div>
    </div>
  ) : (
    <p className="text-xs text-amber-600">Nenhum setor vinculado</p>
  )}
</div>
```

#### Mudanças nos Filtros

**Antes:**
```tsx
{/* Filtro de setor único */}
<select value={filters.sectorId} onChange={...}>
  <option value="">Todos os setores</option>
  {sectors.map(...)}
</select>
```

**Depois:**
```tsx
{/* Multi-select de setores para filtro */}
<div>
  <label className="text-sm font-medium">Setores</label>
  <div className="max-h-32 overflow-y-auto border rounded p-2">
    {sectors.map(sector => (
      <label key={sector.id} className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filters.sectorIds?.includes(sector.id) || false}
          onChange={(e) => {
            const isChecked = e.target.checked;
            setFilters(prev => ({
              ...prev,
              sectorIds: isChecked
                ? [...(prev.sectorIds || []), sector.id]
                : prev.sectorIds?.filter(id => id !== sector.id) || []
            }));
          }}
        />
        {sector.name}
      </label>
    ))}
  </div>
</div>
```

**Lógica de filtragem:**
```typescript
const filteredUsers = users.filter(user => {
  // ... outros filtros

  // Filtro por setores (usuário deve ter pelo menos um dos setores selecionados)
  if (filters.sectorIds && filters.sectorIds.length > 0) {
    const userSectorIds = user.userSectors?.map(us => us.sectorId) || [];
    if (!filters.sectorIds.some(id => userSectorIds.includes(id))) {
      return false;
    }
  }

  return true;
});
```

---

### 5. Dashboard
**Arquivo:** [src/app/(app)/dashboard/page.tsx](src/app/(app)/dashboard/page.tsx)

#### Novas Métricas para Exibir

```tsx
{/* Adicionar cards de métricas de relacionamentos */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
  <Card>
    <CardHeader>
      <CardTitle>Setores Multi-Unidade</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold">
        {sectors.filter(s => s.sectorUnits && s.sectorUnits.length > 1).length}
      </p>
      <p className="text-sm text-muted-foreground">
        Setores servindo múltiplas unidades
      </p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Usuários Multi-Setor</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold">
        {users.filter(u => u.userSectors && u.userSectors.length > 1).length}
      </p>
      <p className="text-sm text-muted-foreground">
        Usuários com acesso a múltiplos setores
      </p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Média de Setores por Usuário</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold">
        {(users.reduce((acc, u) => acc + (u.userSectors?.length || 0), 0) / users.length).toFixed(1)}
      </p>
      <p className="text-sm text-muted-foreground">
        Setores por usuário
      </p>
    </CardContent>
  </Card>
</div>
```

---

### 6. Navegação (App Nav)
**Arquivo:** [src/components/app-nav.tsx](src/components/app-nav.tsx)

#### Atualizar lógica de permissões baseada em setores

**Antes:**
```typescript
const canAccessAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
```

**Depois:**
```typescript
// Verificar se o usuário tem role de admin em algum setor
const hasAdminInAnySector = user?.userSectors?.some(
  us => us.role === 'ADMIN' || us.role === 'OWNER'
) || false;

const canAccessAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || hasAdminInAnySector;
```

#### Adicionar indicador visual de setores

```tsx
{/* No dropdown do usuário, mostrar setores */}
<DropdownMenu>
  <DropdownMenuTrigger>
    {user?.name}
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>Meus Setores</DropdownMenuLabel>
    <DropdownMenuSeparator />
    {user?.userSectors?.map(us => {
      const roleLabels = {
        OWNER: 'Dono',
        ADMIN: 'Admin',
        MEMBER: 'Membro',
        VIEWER: 'Visualizador'
      };

      return (
        <DropdownMenuItem key={us.id}>
          <div className="flex items-center gap-2 w-full">
            <span className={us.isPrimary ? 'font-bold' : ''}>
              {us.sector.name}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {roleLabels[us.role]}
            </span>
            {us.isPrimary && <span className="text-yellow-500">★</span>}
          </div>
        </DropdownMenuItem>
      );
    })}
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => logout()}>
      Sair
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### 7. Permissões por Setor
**Arquivo:** [src/app/(app)/admin/permissions/page.tsx](src/app/(app)/admin/permissions/page.tsx)

#### Adicionar permissões granulares por setor

**Nova funcionalidade sugerida:**

```tsx
{/* Adicionar toggle para ativar permissões granulares por setor */}
<div className="mb-6 p-4 border rounded-lg bg-blue-50">
  <h3 className="font-medium mb-2">Permissões Granulares por Setor</h3>
  <p className="text-sm text-muted-foreground mb-4">
    Permita que usuários tenham diferentes níveis de acesso em cada setor
  </p>

  <div className="space-y-2">
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={permissions.useSectorRoles}
        onChange={(e) => updatePermission('useSectorRoles', e.target.checked)}
      />
      <span className="text-sm">
        Ativar permissões por setor (usa campo `role` em UserSector)
      </span>
    </label>

    {permissions.useSectorRoles && (
      <div className="ml-6 p-3 bg-white rounded border">
        <p className="text-xs text-muted-foreground mb-2">
          Quando ativo, as permissões serão baseadas no role do usuário em cada setor:
        </p>
        <ul className="text-xs space-y-1">
          <li><strong>OWNER:</strong> Acesso total ao setor</li>
          <li><strong>ADMIN:</strong> Pode gerenciar conteúdo e membros</li>
          <li><strong>MEMBER:</strong> Pode criar e editar próprio conteúdo</li>
          <li><strong>VIEWER:</strong> Apenas visualização</li>
        </ul>
      </div>
    )}
  </div>
</div>
```

---

### 8. Componentes de UI Novos

#### Criar componente de seleção de setores reutilizável

**Arquivo:** [src/components/admin/sector-selector.tsx](src/components/admin/sector-selector.tsx) (NOVO)

```tsx
'use client';

import { SectorRole } from '@/types';

interface SectorSelection {
  sectorId: string;
  isPrimary: boolean;
  role: SectorRole;
}

interface SectorSelectorProps {
  sectors: Sector[];
  selectedSectors: SectorSelection[];
  onChange: (sectors: SectorSelection[]) => void;
  companyId?: string;
}

export function SectorSelector({
  sectors,
  selectedSectors,
  onChange,
  companyId
}: SectorSelectorProps) {
  const filteredSectors = companyId
    ? sectors.filter(s => s.companyId === companyId)
    : sectors;

  const toggleSector = (sectorId: string) => {
    const isSelected = selectedSectors.some(s => s.sectorId === sectorId);

    if (isSelected) {
      onChange(selectedSectors.filter(s => s.sectorId !== sectorId));
    } else {
      onChange([...selectedSectors, {
        sectorId,
        isPrimary: selectedSectors.length === 0, // Primeiro é automático
        role: 'MEMBER'
      }]);
    }
  };

  const setPrimary = (sectorId: string) => {
    onChange(selectedSectors.map(s => ({
      ...s,
      isPrimary: s.sectorId === sectorId
    })));
  };

  const setRole = (sectorId: string, role: SectorRole) => {
    onChange(selectedSectors.map(s =>
      s.sectorId === sectorId ? { ...s, role } : s
    ));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Setores</label>
      <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-2">
        {filteredSectors.map(sector => {
          const isSelected = selectedSectors.some(s => s.sectorId === sector.id);
          const selection = selectedSectors.find(s => s.sectorId === sector.id);

          return (
            <div key={sector.id} className="border rounded p-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`sector-${sector.id}`}
                  checked={isSelected}
                  onChange={() => toggleSector(sector.id)}
                />
                <label htmlFor={`sector-${sector.id}`} className="flex-1">
                  <span className="font-medium">{sector.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({sector.sectorUnits?.map(su => su.unit.name).join(', ')})
                  </span>
                </label>
              </div>

              {isSelected && selection && (
                <div className="ml-6 mt-2 flex gap-4 items-center">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="radio"
                      name="primarySector"
                      checked={selection.isPrimary}
                      onChange={() => setPrimary(sector.id)}
                    />
                    Principal
                  </label>

                  <select
                    className="text-xs border rounded px-2 py-1"
                    value={selection.role}
                    onChange={(e) => setRole(sector.id, e.target.value as SectorRole)}
                  >
                    <option value="OWNER">Dono</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="MEMBER">Membro</option>
                    <option value="VIEWER">Visualizador</option>
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedSectors.length === 0 && (
        <p className="text-xs text-amber-600">
          Nenhum setor selecionado
        </p>
      )}
    </div>
  );
}
```

#### Criar componente de seleção de unidades reutilizável

**Arquivo:** [src/components/admin/unit-selector.tsx](src/components/admin/unit-selector.tsx) (NOVO)

```tsx
'use client';

interface UnitSelection {
  unitId: string;
  isPrimary: boolean;
}

interface UnitSelectorProps {
  units: Unit[];
  selectedUnits: UnitSelection[];
  onChange: (units: UnitSelection[]) => void;
  companyId?: string;
}

export function UnitSelector({
  units,
  selectedUnits,
  onChange,
  companyId
}: UnitSelectorProps) {
  const filteredUnits = companyId
    ? units.filter(u => u.companyId === companyId)
    : units;

  const toggleUnit = (unitId: string) => {
    const isSelected = selectedUnits.some(u => u.unitId === unitId);

    if (isSelected) {
      onChange(selectedUnits.filter(u => u.unitId !== unitId));
    } else {
      onChange([...selectedUnits, {
        unitId,
        isPrimary: selectedUnits.length === 0
      }]);
    }
  };

  const setPrimary = (unitId: string) => {
    onChange(selectedUnits.map(u => ({
      ...u,
      isPrimary: u.unitId === unitId
    })));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Unidades *</label>
      <div className="space-y-2">
        {filteredUnits.map(unit => {
          const isSelected = selectedUnits.some(u => u.unitId === unit.id);
          const selection = selectedUnits.find(u => u.unitId === unit.id);

          return (
            <div key={unit.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`unit-${unit.id}`}
                checked={isSelected}
                onChange={() => toggleUnit(unit.id)}
              />
              <label htmlFor={`unit-${unit.id}`} className="flex-1">
                {unit.name}
              </label>
              {isSelected && (
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name="primaryUnit"
                    checked={selection?.isPrimary || false}
                    onChange={() => setPrimary(unit.id)}
                  />
                  Principal
                </label>
              )}
            </div>
          );
        })}
      </div>

      {selectedUnits.length === 0 && (
        <p className="text-xs text-red-500">
          Selecione ao menos uma unidade
        </p>
      )}
    </div>
  );
}
```

---

## 🔄 Fluxo de Migração Sugerido

### Fase 1: Types & Store (Base)
1. ✅ Atualizar [src/types/index.ts](src/types/index.ts)
2. ✅ Atualizar [src/stores/auth-store.ts](src/stores/auth-store.ts)
3. ✅ Adicionar helpers de setor

### Fase 2: Componentes Reutilizáveis
4. ✅ Criar [src/components/admin/unit-selector.tsx](src/components/admin/unit-selector.tsx)
5. ✅ Criar [src/components/admin/sector-selector.tsx](src/components/admin/sector-selector.tsx)

### Fase 3: Formulários
6. ✅ Atualizar [src/app/(app)/admin/sectors/page.tsx](src/app/(app)/admin/sectors/page.tsx)
7. ✅ Atualizar [src/app/(app)/admin/users/page.tsx](src/app/(app)/admin/users/page.tsx)

### Fase 4: Navegação & Dashboard
8. ✅ Atualizar [src/components/app-nav.tsx](src/components/app-nav.tsx)
9. ✅ Atualizar [src/app/(app)/dashboard/page.tsx](src/app/(app)/dashboard/page.tsx)

### Fase 5: Permissões
10. ✅ Atualizar [src/app/(app)/admin/permissions/page.tsx](src/app/(app)/admin/permissions/page.tsx)

### Fase 6: Testes
11. ✅ Testar criação/edição de setores
12. ✅ Testar criação/edição de usuários
13. ✅ Testar filtros
14. ✅ Testar permissões

---

## ⚠️ Pontos de Atenção

1. **Validação:** Ao menos uma unidade deve ser selecionada ao criar setor
2. **Migração de Estado:** Usuários logados precisarão fazer logout/login novamente após a migração
3. **Performance:** Com muitos setores, considerar paginação nos selectors
4. **UX:** Indicar claramente qual é o setor/unidade principal (★)
5. **Fallback:** Exibir mensagem clara quando usuário não tem setores vinculados

---

## 📝 Checklist de Implementação

- [ ] Atualizar types
- [ ] Atualizar auth store
- [ ] Criar componentes reutilizáveis
- [ ] Modificar formulário de setores
- [ ] Modificar formulário de usuários
- [ ] Atualizar cards/displays
- [ ] Atualizar filtros
- [ ] Atualizar navegação
- [ ] Atualizar dashboard
- [ ] Atualizar permissões
- [ ] Testar fluxo completo
- [ ] Atualizar documentação

---

Pronto para começar a implementação! 🚀
