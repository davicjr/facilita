# Dashboard

> Arquivo: `v2/frontend/src/app/(app)/dashboard/page.tsx`
> Linhas: ~380
> Atualizado em: 2026-04-01

---

## 1. Resumo executivo

O Dashboard é uma página exclusiva do SUPERADMIN que exibe métricas agregadas de links, documentos, notas, usuários e categorias com filtros de período, visibilidade e tipo de conteúdo. Está bem estruturado: usa `Promise.all`, `active` flag, `useMemo` para derivações e os estados `fac-loading-state`/`fac-error-state` do design system. Os problemas são localizados: acentuação ausente em vários strings, uma IIFE no JSX que deveria estar no `useMemo`, e o guard de SUPERADMIN dentro do `load()` em vez do render. Nenhum problema estrutural grave.

**Nível de prioridade:** Baixa (página de uso restrito, já em bom estado)

---

## 2. O que está bom

- **`Promise.all` para 4 fetches em paralelo** — correto e eficiente
- **`active` flag com cleanup** — evita setState após desmontagem
- **`useMemo` encadeado para derivações** — `filteredLinks` → `filteredSchedules` → `filteredNotes` → `visibleByContent` → `stats` — cadeia clara, sem recálculo desnecessário
- **`getApiErrorMessage` já importado e usado** — sem duplicação de utilitário de erro
- **`fac-loading-state` e `fac-error-state` já usados** — consistente com o design system
- **`stats` como único objeto derivado** — todos os números do dashboard saem de um único `useMemo`, fácil de rastrear

---

## 3. O que está ruim

### 3.1 · Acentuação ausente em vários strings

```tsx
// linha 159
const periodLabel = period === 'ALL' ? 'Periodo completo' : `Ultimos ${period} dias`;
//                                      ^                    ^
//                                      Período              Últimos

// linha 173
<p>Acompanhe links criados, publicacao e engajamento.</p>
//                          ^
//                          publicação

// linha 179
<p className="fac-kicker mb-1">Visao geral</p>
//                              ^
//                              Visão geral

// linha 187
<h2 className="fac-title-md">Dashboard de conteudo</h2>
//                                          ^
//                                          conteúdo

// linha 188
<p>Filtros e metricas para administracao.</p>
//             ^                ^
//             métricas         administração

// linha 199
<option value="30">Ultimos 30 dias</option>
//                  ^
//                  Últimos

// linha 200
<option value="7">Ultimos 7 dias</option>

// linha 215
<option value="PUBLIC">Publicas</option>
//                      ^
//                      Públicas

// linha 274
<p className="fac-kicker">Distribuicao por tipo</p>
//                          ^
//                          Distribuição

// linha 313
<p>{visibility === 'ALL' ? 'Todas' : visibility}</p>  // OK — mas o valor 'PUBLIC'/'PRIVATE' aparece cru
// Considerar exibir label legível: "Públicas" / "Restritas"

// linha 339
<span>Publicos</span>
//    ^
//    Públicos

// linha 373
<div>Usuarios ativos: {stats.usersActive} de {stats.users}.</div>
//   ^
//   Usuários
```

### 3.2 · IIFE no JSX — derivação que deveria estar no `stats` useMemo

```tsx
// linha 315-336 — IIFE para calcular totalPublic/totalPrivate no JSX
{(() => {
  const totalPublic = stats.linkPublic + stats.schedulePublic + stats.notePublic;
  const totalPrivate = stats.linkPrivate + stats.schedulePrivate + stats.notePrivate;
  const total = totalPublic + totalPrivate;

  return (
    <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-muted/80">
      {total > 0 ? (
        <>
          <div style={{ width: `${(totalPublic / total) * 100}%` }} ... />
          <div style={{ width: `${(totalPrivate / total) * 100}%` }} ... />
        </>
      ) : null}
    </div>
  );
})()}
```

`totalPublic` e `totalPrivate` são derivados de campos que já existem em `stats`. Computar isso dentro de uma IIFE no JSX mistura lógica com apresentação, dificulta leitura e impede reutilização.

A solução é mover para o `stats` useMemo:

```typescript
return {
  // ... campos existentes ...
  totalPublic: linkPublic + schedulePublic + notePublic,
  totalPrivate: linkPrivate + schedulePrivate + notePrivate,
};
```

E usar `stats.totalPublic` / `stats.totalPrivate` diretamente no JSX, sem IIFE.

### 3.3 · Guard de SUPERADMIN dentro do `load()` em vez do render

```typescript
// linha 40-49 — guard dentro do useEffect/load()
const load = async () => {
  if (!hasHydrated) return;
  if (!user) {
    setLoading(false);
    setError('Faça login para acessar o dashboard.');
    return;
  }
  if (user.role !== 'SUPERADMIN') {
    setLoading(false);
    setError('Acesso restrito ao superadmin.');
    return;
  }
  // ...fetch...
};
```

O problema é que o guard executa de forma assíncrona: o componente renderiza, monta, inicia o effect, e **só então** processa o guard. Isso significa que um USER comum que acessa `/dashboard` diretamente verá brevemente o `fac-loading-state` antes de receber o `fac-error-state` de acesso restrito.

O guard deveria estar no render, antes de qualquer JSX:

```tsx
// Após hasHydrated
if (hasHydrated && user && user.role !== 'SUPERADMIN') {
  return <div className="fac-error-state">Acesso restrito ao superadmin.</div>;
}
```

Isso elimina o flash de loading e torna o comportamento previsível. O `load()` pode então assumir que `user` e `user.role === 'SUPERADMIN'` sempre valem quando executa.

---

## 4. O que está repetido ou mal distribuído

| Item | Situação |
|---|---|
| `totalPublic` / `totalPrivate` | Computado via IIFE no JSX — deveria estar em `stats` |
| Strings sem acento | 12+ ocorrências |
| Visibilidade exibindo `'PUBLIC'`/`'PRIVATE'` cru | Linha 313 mostra o valor enum sem tradução |

---

## 5. O que pode ser removido ou simplificado

### IIFE da barra de visibilidade

Ao mover `totalPublic` e `totalPrivate` para o `stats` useMemo, a IIFE pode ser substituída por JSX direto:

```tsx
<div className="mb-3 flex h-2 overflow-hidden rounded-full bg-muted/80">
  {stats.totalItems > 0 ? (
    <>
      <div
        className="h-full bg-primary transition-all duration-500"
        style={{ width: `${(stats.totalPublic / (stats.totalPublic + stats.totalPrivate)) * 100}%` }}
      />
      <div
        className="h-full bg-muted-foreground/40 transition-all duration-500"
        style={{ width: `${(stats.totalPrivate / (stats.totalPublic + stats.totalPrivate)) * 100}%` }}
      />
    </>
  ) : null}
</div>
```

---

## 6. Problemas de arquitetura e organização

### 6.1 · Guard de acesso como efeito colateral

O padrão atual usa `setError` para comunicar acesso não-autorizado. Isso é semanticamente incorreado — o estado `error` é para erros de rede/API, não para controle de acesso. Um USER que acessa `/dashboard` vê a mesma UI de erro de um SUPERADMIN que perde conexão com a API.

O guard no render (item 3.3) resolve isso semanticamente: acesso negado e erro de fetch são tratados de formas distintas.

### 6.2 · Ausência de proteção de rota no layout

O dashboard não tem proteção de rota no nível de layout ou middleware — qualquer usuário autenticado pode acessar `/dashboard` e verá o flash de loading antes do erro. A proteção definitiva seria via `middleware.ts` do Next.js ou um layout do grupo `(app)` que redireciona não-SUPERADMIN.

Isso está fora do escopo desta rodada de refatoração, mas é o passo seguinte natural depois de consolidar os guards nos renders.

---

## 7. O que vamos mudar

1. **Corrigir toda a acentuação** — 12+ strings
2. **Mover `totalPublic` e `totalPrivate` para o `stats` useMemo** — eliminar IIFE do JSX
3. **Mover guard de SUPERADMIN para o render** — eliminar flash de loading e separar acesso negado de erro de rede
4. **Traduzir label de visibilidade** — "PUBLIC" → "Públicas" no card de distribuição

---

## 8. Plano de refatoração

### Etapa 1 — Corrigir acentuação

**Arquivo:** `dashboard/page.tsx`

Substituições:

| Original | Correto |
|---|---|
| `'Periodo completo'` | `'Período completo'` |
| `` `Ultimos ${period} dias` `` | `` `Últimos ${period} dias` `` |
| `'publicacao'` | `'publicação'` |
| `'Visao geral'` | `'Visão geral'` |
| `'conteudo'` | `'conteúdo'` |
| `'metricas'` | `'métricas'` |
| `'administracao'` | `'administração'` |
| `'Ultimos 30 dias'` | `'Últimos 30 dias'` |
| `'Ultimos 7 dias'` | `'Últimos 7 dias'` |
| `'Publicas'` | `'Públicas'` |
| `'Distribuicao por tipo'` | `'Distribuição por tipo'` |
| `'Publicos'` | `'Públicos'` |
| `'Usuarios ativos'` | `'Usuários ativos'` |

**Bonus:** Linha 313 — quando `visibility !== 'ALL'`, exibir `'Públicas'` ou `'Restritas'` em vez do valor enum raw:

```tsx
// De:
<p className="text-[13px] text-muted-foreground">{visibility === 'ALL' ? 'Todas' : visibility}</p>

// Para:
<p className="text-[13px] text-muted-foreground">
  {visibility === 'ALL' ? 'Todas' : visibility === 'PUBLIC' ? 'Públicas' : 'Restritas'}
</p>
```

---

### Etapa 2 — Mover `totalPublic`/`totalPrivate` para `stats` useMemo

**Arquivo:** `dashboard/page.tsx`

```typescript
// No useMemo de stats, adicionar:
return {
  // ... campos existentes ...
  totalPublic: linkPublic + schedulePublic + notePublic,
  totalPrivate: linkPrivate + schedulePrivate + notePrivate,
};
```

Substituir a IIFE no JSX por referências diretas a `stats.totalPublic` e `stats.totalPrivate`.

---

### Etapa 3 — Guard de SUPERADMIN no render

**Arquivo:** `dashboard/page.tsx`

```tsx
// Adicionar antes do return com JSX (após os hooks):

if (hasHydrated && !user) {
  return <div className="fac-error-state">Faça login para acessar o dashboard.</div>;
}

if (hasHydrated && user && user.role !== 'SUPERADMIN') {
  return <div className="fac-error-state">Acesso restrito ao superadmin.</div>;
}
```

Remover os guards do interior de `load()`:

```typescript
// Remover do load():
if (!user) {
  setLoading(false);
  setError('Faça login para acessar o dashboard.');
  return;
}
if (user.role !== 'SUPERADMIN') {
  setLoading(false);
  setError('Acesso restrito ao superadmin.');
  return;
}
```

**Atenção:** O `load()` ainda deve verificar `if (!hasHydrated) return;` no início — o guard no render só executa depois de `hasHydrated` ser `true`, e o effect pode disparar antes disso.

---

## 9. Checklist de implementação

### Etapa 1 — Acentuação
- [x] Corrigir `'Periodo completo'` → `'Período completo'`
- [x] Corrigir `` `Ultimos ${period} dias` `` → `` `Últimos ${period} dias` ``
- [x] Corrigir `'publicacao'` → `'publicação'` na descrição
- [x] Corrigir `'Visao geral'` → `'Visão geral'`
- [x] Corrigir `'conteudo'` → `'conteúdo'` no h2
- [x] Corrigir `'metricas'` e `'administracao'` na descrição
- [x] Corrigir `'Ultimos 30 dias'` e `'Ultimos 7 dias'` no select
- [x] Corrigir `'Publicas'` → `'Públicas'` no select de visibilidade
- [x] Corrigir `'Distribuicao por tipo'` → `'Distribuição por tipo'`
- [x] Corrigir `'Publicos'` → `'Públicos'` no card de visibilidade
- [x] Corrigir `'Usuarios ativos'` → `'Usuários ativos'`
- [x] Traduzir label de visibilidade na linha do card (PUBLIC → "Públicas", PRIVATE → "Restritas")

### Etapa 2 — IIFE → stats
- [x] Adicionar `totalPublic` e `totalPrivate` ao objeto `stats` do useMemo
- [x] Substituir a IIFE por JSX direto usando `stats.totalPublic` / `stats.totalPrivate`
- [ ] Verificar que os percentuais da barra continuam corretos

### Etapa 3 — Guard no render
- [x] Adicionar guard `!user` no render (antes do JSX)
- [x] Adicionar guard `user.role !== 'SUPERADMIN'` no render
- [x] Remover os guards correspondentes de dentro do `load()`
- [ ] Verificar que o estado de loading não pisca ao acessar com USER comum
- [ ] Verificar que SUPERADMIN ainda carrega normalmente

---

## 10. Riscos e cuidados

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Guard no render disparar antes de `hasHydrated` | Média | Usar `hasHydrated &&` como condição — não renderizar os guards até o store estar hidratado |
| Barra de distribuição de visibilidade ficar incorreta ao mover totalPublic/totalPrivate | Baixa | Verificar que a soma `totalPublic + totalPrivate === totalItems` em todos os estados de filtro |
| Acentuação alterar strings usadas como `value` em `<select>` | Nenhuma | As correções são apenas em `<option>` labels e textos visíveis — os `value` permanecem `'ALL'`, `'PUBLIC'`, `'PRIVATE'` |
