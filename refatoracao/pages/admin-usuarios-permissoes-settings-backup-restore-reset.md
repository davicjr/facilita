# Admin — Usuários, Permissões, Configurações, Backup, Restauração e Reset

> Arquivos:
> - `v2/frontend/src/app/(app)/admin/users/page.tsx`
> - `v2/frontend/src/app/(app)/admin/permissions/page.tsx`
> - `v2/frontend/src/app/(app)/admin/settings/page.tsx`
> - `v2/frontend/src/app/(app)/admin/backup/page.tsx`
> - `v2/frontend/src/app/(app)/admin/restore/page.tsx`
> - `v2/frontend/src/app/(app)/admin/reset/page.tsx`
> Atualizado em: 2026-04-02

---

## 1. Resumo executivo

O bloco já estava estável em comportamento. Nesta rodada foram fechadas apenas pendências pequenas de consistência visual e reutilização de utilitário:

- `admin/users`: guard de acesso migrado para `fac-error-state`
- `admin/permissions`: guard, loading e error migrados para `fac-*`
- `admin/settings`: `formatBytes` local removido e estados principais alinhados ao design system
- `admin/backup`, `admin/restore` e `admin/reset`: sem mudanças necessárias

**Nível de prioridade:** Baixa

---

## 2. O que foi ajustado

### `admin/users/page.tsx`

- guard de acesso trocado de bloco ad-hoc para `<div className="fac-error-state">`

### `admin/permissions/page.tsx`

- guard de acesso trocado para `<div className="fac-error-state">`
- loading trocado para `<div className="fac-loading-state">`
- error trocado para `<div className="fac-error-state">`
- arquivo regravado em UTF-8 limpo

### `admin/settings/page.tsx`

- remoção de `formatBytes` local
- adição de `import { formatBytes } from '@/lib/format'`
- troca das chamadas para `formatBytes(file.size, 1)`
- loading principal trocado para `fac-loading-state border-dashed`
- empty principal trocado para `fac-empty-state border-dashed`

### `admin/backup/page.tsx`

- nenhuma alteração necessária

### `admin/restore/page.tsx`

- nenhuma alteração necessária

### `admin/reset/page.tsx`

- nenhuma alteração necessária

---

## 3. Checklist de implementação

### `admin/users/page.tsx`
- [x] Substituir guard de acesso por `<div className="fac-error-state">`

### `admin/permissions/page.tsx`
- [x] Substituir loading inline por `<div className="fac-loading-state">`
- [x] Substituir error inline por `<div className="fac-error-state">`
- [x] Substituir guard de acesso inline por `<div className="fac-error-state">`

### `admin/settings/page.tsx`
- [x] Remover `formatBytes` local
- [x] Adicionar `import { formatBytes } from '@/lib/format'`
- [x] Substituir chamadas por `formatBytes(file.size, 1)`
- [x] Substituir loading inline por `fac-loading-state border-dashed`
- [x] Substituir empty inline por `fac-empty-state border-dashed`

### `admin/backup/page.tsx`
- [x] Nenhuma alteração necessária

### `admin/restore/page.tsx`
- [x] Nenhuma alteração necessária

### `admin/reset/page.tsx`
- [x] Nenhuma alteração necessária

---

## 4. Riscos e cuidados

O único cuidado real aqui era a mudança de `formatBytes` em `settings`. Isso foi mitigado chamando `formatBytes(file.size, 1)` para manter a exibição próxima da função local anterior.
