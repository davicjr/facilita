# Admin — Documentos e Notas

> Arquivos:
> - `v2/frontend/src/app/(app)/admin/schedules/page.tsx`
> - `v2/frontend/src/app/(app)/admin/notes/page.tsx`
> Atualizado em: 2026-04-02

---

## 1. Resumo executivo

As páginas de Documentos e Notas já estavam estruturalmente corretas e alinhadas ao padrão dos CRUDs principais. Nesta rodada o trabalho foi apenas finalizar a normalização de texto dos formulários. Não houve mudança estrutural, de comportamento ou de fluxo.

**Nível de prioridade:** Baixa

---

## 2. O que foi ajustado

### `admin/schedules/page.tsx`

- `Titulo` → `Título`
- `Publica` → `Pública`
- `Token publico (opcional)` → `Token público (opcional)`
- `Previa do card` → `Prévia do card`

### `admin/notes/page.tsx`

- `Titulo` → `Título`
- `Conteudo` → `Conteúdo`
- `Publica` → `Pública`
- `Token publico (opcional)` → `Token público (opcional)`
- `Previa do card` → `Prévia do card`

---

## 3. Checklist de implementação

### `admin/schedules/page.tsx`
- [x] `Titulo` → `Título`
- [x] `Publica` → `Pública`
- [x] `Token publico (opcional)` → `Token público (opcional)`
- [x] `Previa do card` → `Prévia do card`

### `admin/notes/page.tsx`
- [x] `Titulo` → `Título`
- [x] `Conteudo` → `Conteúdo`
- [x] `Publica` → `Pública`
- [x] `Token publico (opcional)` → `Token público (opcional)`
- [x] `Previa do card` → `Prévia do card`

---

## 4. Riscos e cuidados

Nenhum risco relevante. Foram apenas ajustes de texto em labels e opções visuais, sem alterar `value`, payload, estados ou regras de negócio.
