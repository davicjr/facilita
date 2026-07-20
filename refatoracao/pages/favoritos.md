# Favoritos

> Arquivo: `v2/frontend/src/app/(app)/favoritos/page.tsx`
> Linhas: ~350
> Atualizado em: 2026-04-02

---

## 1. Resumo executivo

A página de favoritos é estruturalmente quase idêntica à home — mesma cadeia de `useMemo`, mesma lógica de cards, mesmo modal de nota. O problema é que ela não acompanhou as correções que a home recebeu na última rodada de refatoração: ainda usa `<div role="button">` em vez de `<button>`, ainda exibe o badge de status em todos os itens (não só inativos), ainda usa classes ad-hoc nos estados de loading/empty, e tem um bug real — o `FavoriteButton` está dentro da área clicável do card, fazendo com que clicar na estrela de favorito também acione `openItem`.

**Nível de prioridade:** Média (tem um bug funcional real além das inconsistências)

---

## 2. O que está bom

- **`useFavorites` encapsula o fetch** — a página não faz fetch diretamente; delega para o hook
- **`getContrastTextColor` importado de `lib/color`** — sem duplicação local
- **`resolveAssetUrl` importado de `lib/image`** — sem duplicação local
- **`ContentCoverImage` já usado** — consistente com o padrão atual
- **`noteMap` para lookup de nota** — mesmo padrão da home, correto
- **Cadeia de `useMemo`** — `items` → `searchedItems` → `categoryTabs` → `filteredItems` — clara e sem recálculo desnecessário
- **`globalSearch` do `ui-store`** — busca da topbar integrada automaticamente

---

## 3. O que está ruim

### 3.1 · Bug: `FavoriteButton` dentro da área clicável do card

```tsx
<div
  className="relative aspect-square overflow-hidden bg-muted cursor-pointer"
  onClick={() => openItem(item)}    // ← abre o item
  ...
>
  ...
  <div className="absolute right-3 top-3 flex items-center gap-2">
    <FavoriteButton entityType={item.type} entityId={item.id} />  // ← click propaga para openItem!
    {item.type === 'SCHEDULE' && item.fileUrl ? (
      <button
        onClick={(event) => {
          event.stopPropagation();  // download usa stopPropagation, mas FavoriteButton não
          ...
        }}
      >
  </div>
```

O `FavoriteButton` não chama `event.stopPropagation()`. Clicar no ícone de favorito dispara dois eventos: o próprio `onClick` do `FavoriteButton` (toggle de favorito) **e** o `onClick` do `<div>` pai (que chama `openItem`). O resultado é que ao favoritar/desfavoritar, o link é aberto em nova aba ou o modal de nota aparece.

**O download button usa `stopPropagation` corretamente — o FavoriteButton não.**

A home corrigiu esse problema movendo o `FavoriteButton` para fora do elemento clicável, com `pointer-events-none`/`pointer-events-auto`:

```tsx
// Padrão correto (como a home faz hoje):
<article className="fac-card relative w-[220px] ...">
  <button type="button" onClick={() => openItem(item)} disabled={isInactive}>
    {/* apenas conteúdo visual aqui */}
  </button>
  <div className="pointer-events-none absolute right-3 top-3 ...">
    <div className="pointer-events-auto">
      <FavoriteButton entityType={item.type} entityId={item.id} />
    </div>
  </div>
</article>
```

### 3.2 · `<div role="button">` em vez de `<button>`

```tsx
<div
  className="relative aspect-square overflow-hidden bg-muted cursor-pointer"
  onClick={() => openItem(item)}
  onKeyDown={(event) => {
    if ((event.key === 'Enter' || event.key === ' ') && !isInactive) {
      event.preventDefault();
      openItem(item);
    }
  }}
  role="button"
  tabIndex={isInactive ? -1 : 0}
>
```

Padrão antigo — home foi corrigida para usar `<button type="button" disabled={isInactive}>`. A corretiva do `onKeyDown` manual deve ser removida junto com a migração.

### 3.3 · Badge de status em todos os cards (inclusive ativos)

```tsx
<span className="fac-status-badge absolute bottom-3 left-3" data-status={item.status}>
  {item.status === 'ACTIVE' ? (
    <Check className="h-5 w-5" />
  ) : (
    <Ban className="h-5 w-5" />
  )}
</span>
```

Mesmo problema já corrigido na home: o badge verde de `Check` em todos os cards ativos é ruído visual. Em favoritos, faz menos sentido ainda — o usuário sabe que marcou o item como favorito; o badge de "ACTIVE" não agrega informação. Deve ser condicional para itens inativos apenas.

### 3.4 · Estados de loading/empty com classes ad-hoc

```tsx
// Loading
<div className="fac-panel px-6 py-10 text-center text-[14px] text-muted-foreground">
  Carregando favoritos...
</div>

// Empty
<div className="fac-panel px-6 py-10 text-center text-[14px] text-muted-foreground">
  Nenhum favorito encontrado.
</div>
```

O design system tem `fac-loading-state` e `fac-empty-state` para exatamente isso. A home foi corrigida — favoritos ficou para trás.

### 3.5 · Mensagem de empty state não diferencia contextos

"Nenhum favorito encontrado." aparece tanto quando o usuário ainda não favoritou nada, quanto quando a busca/filtro não retorna resultados. A home distingue os casos:

```tsx
const emptyMessage = searchTerm
  ? `Nenhum resultado para "${searchTerm}".`
  : hasActiveFilters
    ? 'Nenhum item corresponde aos filtros selecionados.'
    : 'Nenhum item disponível no portal.';
```

O mesmo padrão deve ser aplicado em favoritos: sem favoritos → "Você ainda não tem favoritos.", busca vazia → `"Nenhum resultado para '${searchTerm}'."`, filtro vazio → "Nenhum favorito corresponde ao filtro."

### 3.6 · `imageUrl` pré-resolvido manualmente antes do `ContentCoverImage`

```tsx
const imageUrl = item.imageUrl ? resolveAssetUrl(item.imageUrl) : '';
// ...
<ContentCoverImage src={imageUrl} ... />
```

A home passa `src={item.imageUrl}` diretamente (que pode ser `null`). `ContentCoverImage` aceita `null` e trata internamente. A pré-resolução manual na favoritos é redundante e inconsistente — além de passar `''` (string vazia) quando não há imagem, em vez de `null` ou `undefined`.

### 3.7 · Sem estado de erro

`useFavorites` retorna `{ favorites, loading }` sem expor `error`. Se o fetch falhar (rede, 401, 500), a página mostra o estado de empty silenciosamente — sem nenhuma mensagem de erro para o usuário. A home expõe e exibe `error` corretamente.

---

## 4. O que está repetido em relação à home

A estrutura de cards de favoritos é ~80% idêntica à home. Isso não é um problema a corrigir agora (extrair um `<ContentCard>` compartilhado seria a solução definitiva), mas é a raiz de por que favoritos ficou desatualizado: quando a home foi corrigida, a mesma correção não foi propagada.

| Ponto corrigido na home | Status em favoritos |
|---|---|
| `<button>` em vez de `<div role="button">` | ❌ ainda usa `<div role="button">` |
| FavoriteButton fora da área clicável | ❌ dentro, sem `stopPropagation` |
| Badge condicional para inativos | ❌ mostra badge em todos |
| `fac-loading-state` / `fac-empty-state` | ❌ usa classes inline |
| Mensagem de empty contextual | ❌ mensagem genérica |
| `src` passado direto ao `ContentCoverImage` | ❌ pré-resolve com `resolveAssetUrl` + empty string |

---

## 5. O que pode ser removido ou simplificado

### Import `Check` pode ser removido

Após tornar o badge condicional para inativos apenas, o ícone `Check` deixa de ser usado — pode ser removido do import.

### `imageUrl` variável intermediária

Remover `const imageUrl = ...` e passar `src={item.imageUrl}` diretamente ao `ContentCoverImage`.

### `onKeyDown` no `<div>`

Ao migrar para `<button>`, o `onKeyDown` manual pode ser removido.

---

## 6. O que vamos mudar

1. **Corrigir o bug do `FavoriteButton`** — mover para fora do elemento clicável com `pointer-events-none`/`pointer-events-auto`
2. **Substituir `<div role="button">` por `<button>`** — mesma correção da home
3. **Badge de status condicional** — mostrar apenas para inativos
4. **Usar `fac-loading-state` e `fac-empty-state`** — consistência com design system
5. **Mensagem de empty contextual** — diferenciar "sem favoritos", "busca vazia", "filtro vazio"
6. **Passar `src` direto ao `ContentCoverImage`** — remover pré-resolução redundante
7. **Verificar `useFavorites`** — se o hook não expõe `error`, avaliar se vale a pena adicioná-lo

---

## 7. Plano de refatoração

### Etapa 1 — Corrigir o bug do FavoriteButton + migrar para `<button>`

Essa etapa resolve os itens 3.1 e 3.2 juntos, porque a solução é a mesma: reestruturar o card para que o `<button>` seja apenas o elemento clicável da imagem, e os controles (FavoriteButton, download) fiquem posicionados absolutamente no `<article>`.

```tsx
// De:
<article className={`fac-card w-[220px] ${isInactive ? 'opacity-80 grayscale' : ''}`}>
  <div
    className="relative aspect-square overflow-hidden bg-muted cursor-pointer"
    onClick={() => openItem(item)}
    onKeyDown={...}
    role="button"
    tabIndex={isInactive ? -1 : 0}
  >
    ...
    <div className="absolute right-3 top-3 flex items-center gap-2">
      <FavoriteButton ... />           {/* BUG: dentro do clicável */}
      <button onClick={(e) => { e.stopPropagation(); ... }}>  {/* stopPropagation manual */}
    </div>
  </div>
</article>

// Para:
<article
  key={`${item.type}-${item.id}`}
  className={`fac-card relative w-[220px] ${isInactive ? 'opacity-80 grayscale' : ''}`}
>
  <button
    type="button"
    className="relative aspect-square w-full overflow-hidden bg-muted text-left disabled:cursor-not-allowed"
    onClick={() => openItem(item)}
    disabled={isInactive}
    aria-label={`Abrir ${item.title}`}
  >
    {/* apenas conteúdo visual: imagem, badge de categoria, badge de tipo, badge de status */}
  </button>

  <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2">
    <div className="pointer-events-auto">
      <FavoriteButton entityType={item.type} entityId={item.id} />
    </div>
    {item.type === 'SCHEDULE' && item.fileUrl ? (
      <button
        type="button"
        className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/95 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => window.open(resolveAssetUrl(item.fileUrl!), '_blank', 'noopener,noreferrer')}
        aria-label="Baixar documento"
        disabled={isInactive}
      >
        <Download className="h-4 w-4" />
      </button>
    ) : null}
  </div>
</article>
```

**Atenção:** Ao adicionar `relative` no `<article>`, confirmar que os elementos posicionados absolutamente dentro do `<button>` (badge de categoria, badge de tipo, badge de status) mantêm o posicionamento correto — eles continuam relativos ao `<button>`, não ao `<article>`.

---

### Etapa 2 — Badge condicional

```tsx
// De: sempre exibido
<span className="fac-status-badge absolute bottom-3 left-3" data-status={item.status}>
  {item.status === 'ACTIVE' ? (
    <Check className="h-5 w-5" />
  ) : (
    <Ban className="h-5 w-5" />
  )}
</span>

// Para: somente para inativos
{isInactive ? (
  <span className="fac-status-badge absolute bottom-3 left-3" data-status="INACTIVE">
    <Ban className="h-5 w-5" />
  </span>
) : null}
```

Remover `Check` do import após a mudança.

---

### Etapa 3 — Estados de loading/empty com design system

```tsx
// De (loading):
<div className="fac-panel px-6 py-10 text-center text-[14px] text-muted-foreground">
  Carregando favoritos...
</div>

// Para:
<div className="fac-loading-state">Carregando favoritos...</div>

// De (empty):
<div className="fac-panel px-6 py-10 text-center text-[14px] text-muted-foreground">
  Nenhum favorito encontrado.
</div>

// Para:
<div className="fac-empty-state">{emptyMessage}</div>
```

Adicionar a variável `emptyMessage` antes do return:

```tsx
const searchTerm = globalSearch.trim();
const hasActiveFilters = searchTerm.length > 0 || typeFilter !== 'ALL' || categoryFilter !== 'ALL';
const emptyMessage = searchTerm
  ? `Nenhum resultado para "${searchTerm}".`
  : hasActiveFilters
    ? 'Nenhum favorito corresponde ao filtro.'
    : 'Você ainda não tem favoritos.';
```

---

### Etapa 4 — `src` direto ao `ContentCoverImage`

```tsx
// De:
const imageUrl = item.imageUrl ? resolveAssetUrl(item.imageUrl) : '';
// ...
<ContentCoverImage src={imageUrl} ... />

// Para:
<ContentCoverImage src={item.imageUrl} ... />
```

Remover a variável `imageUrl`. Confirmar que `ContentCoverImage` aceita `null` no tipo de `src`.

---

### Etapa 5 — Verificar `useFavorites` para exposição de `error`

Ler `hooks/useFavorites.tsx` e verificar se:
- O hook tem estado de erro interno
- Se sim, expô-lo e adicionar `{error && <div className="fac-error-state">{error}</div>}` na página
- Se não, avaliar se vale adicionar (depende da política do hook)

---

## 8. Checklist de implementação

### Etapa 1 — Bug FavoriteButton + migração para `<button>`
- [x] Adicionar `relative` no `<article>`
- [x] Substituir `<div role="button">` por `<button type="button">`
- [x] Adicionar `disabled={isInactive}` e `aria-label={`Abrir ${item.title}`}`
- [x] Remover `onKeyDown` manual
- [x] Remover `tabIndex` (desnecessário com `<button>`)
- [x] Mover `FavoriteButton` para fora do `<button>`, com `pointer-events-none`/`pointer-events-auto` no wrapper
- [x] Remover `event.stopPropagation()` do botão de download (já não é mais necessário)
- [ ] Verificar que o layout do card não quebrou

### Etapa 2 — Badge condicional
- [x] Tornar o badge condicional para `isInactive` apenas
- [x] Remover o ícone `Check` do badge
- [x] Remover `Check` do import de `lucide-react`

### Etapa 3 — Estados
- [x] Substituir loading div por `<div className="fac-loading-state">`
- [x] Adicionar variável `emptyMessage` com três níveis de mensagem
- [x] Substituir empty div por `<div className="fac-empty-state">{emptyMessage}</div>`

### Etapa 4 — ContentCoverImage src
- [x] Remover variável `imageUrl` intermediária
- [x] Passar `src={item.imageUrl}` diretamente ao `ContentCoverImage`

### Etapa 5 — useFavorites error
- [x] Ler `hooks/useFavorites.tsx`
- [x] Se tiver estado de erro, expô-lo e exibir na página
- [x] Se não tiver, avaliar adicionar

---

## 9. Riscos e cuidados

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Layout do card quebrar ao adicionar `relative` no `<article>` | Baixa | Testar visualmente — os absolutamente posicionados dentro do `<button>` continuam relativos ao `<button>` |
| `ContentCoverImage` não aceitar `null` em `src` | Baixa | Verificar o tipo de `src` na definição do componente — home já usa `src={item.imageUrl}` sem pré-resolução |
| Remover `stopPropagation` do botão de download causar abertura dupla do item | Nenhuma | Com o botão de download fora do `<button>` principal, não há mais propagação para tratar |
| `useFavorites` não expor `error` e necessitar de alteração no hook | Média | Verificar antes de alterar — pode ser que o hook use o interceptor de API para erros |
