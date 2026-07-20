# Home — Portal

> Arquivo: `v2/frontend/src/app/(app)/page.tsx`
> Linhas: ~422
> Atualizado em: 2026-04-01

---

## 1. Resumo executivo

A Home é a página mais acessada do sistema — o portal de conteúdo que os usuários veem todos os dias. Está funcional e já incorpora melhorias da última rodada de refatoração (`getApiErrorMessage`, `resolveAssetUrl`, `ContentCoverImage`). Os problemas que restam são menores em quantidade, mas relevantes em qualidade: estados visuais inconsistentes com o design system, uma função utilitária ainda local, um card com problema de acessibilidade, e ausência de paginação. A prioridade é alta por ser a página de maior visibilidade.

**Nível de prioridade:** Alta (página principal do produto)

---

## 2. O que está bom

- **Três fetches em paralelo:** `Promise.all` para links, schedules e notes — correto e eficiente
- **Cleanup de request com `active` flag:** Evita race condition quando o componente desmonta antes da resposta chegar
- **`useMemo` encadeados e bem estruturados:** `mappedItems` → `searchedItems` → `categoryTabs` → `filteredItems` — a cadeia de derivação é clara e evita recálculo desnecessário
- **Busca integrada ao `globalSearch` do `ui-store`:** A busca da topbar funciona automaticamente nessa página sem configuração extra
- **`ContentCoverImage` já integrado:** O componente compartilhado é usado tanto nos cards da lista quanto no modal de nota
- **`resolveAssetUrl` e `getApiErrorMessage` já importados de `lib/`:** Duplicação eliminada
- **Filtros por tipo, visibilidade e categoria:** Combinação de filtros bem construída via `useMemo`
- **Categorias como pills com cor dinâmica:** A lógica de cor de texto contrastante (`getContrastTextColor`) funciona bem
- **Modal de nota reutiliza `AdminModal`:** Consistente com o restante do design
- **Download de documento acessível:** O botão de download do Schedule tem `aria-label`

---

## 3. O que está ruim

### 3.1 · Estados de loading/error/empty com classes inconsistentes

Os três estados usam markup ad-hoc em vez das classes do design system:

```tsx
// Loading — usa fac-panel + classes inline
<div className="fac-panel px-6 py-10 text-center text-[14px] text-muted-foreground">
  Carregando itens...
</div>

// Error — usa fac-panel com overrides de cor sem semântica
<div className="fac-panel border-red-400 bg-red-50 px-6 py-4 text-[14px] text-red-700">
  {error}
</div>

// Empty — igual ao loading, sem distinção visual
<div className="fac-panel px-6 py-10 text-center text-[14px] text-muted-foreground">
  Nenhum item encontrado.
</div>
```

O design system já define `fac-loading-state`, `fac-error-state` e `fac-empty-state` para exatamente isso. As páginas de admin CRUD já foram atualizadas para usá-los — a home ficou para trás.

**Problema extra no estado de erro:** Usa `border-red-400 bg-red-50 text-red-700` (classes Tailwind hardcoded) em vez de `text-destructive` e `bg-destructive/5` (tokens do design system). Não funciona corretamente no tema escuro.

### 3.2 · `getContrastTextColor` ainda local

```typescript
// linha 41 — ainda local, deveria estar em lib/
function getContrastTextColor(color: string) {
  const hex = color.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#263238';
  const value = Number.parseInt(hex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#263238' : '#ffffff';
}
```

Essa função é específica de cor e não tem relação com imagens — deveria ir para `lib/color.ts`.

### 3.3 · Card do portal usa `<div role="button">` em vez de `<button>`

```tsx
<div
  className="relative aspect-square overflow-hidden bg-muted cursor-pointer"
  onClick={() => openItem(item)}
  onKeyDown={(event) => { ... }}
  role="button"
  tabIndex={isInactive ? -1 : 0}
>
```

O padrão correto é usar `<button>` diretamente. `<div role="button">` com `onKeyDown` manual é uma reimplementação trabalhosa do comportamento nativo de `<button>`. Ao usar `<button>`:
- O `Enter` e `Space` funcionam sem `onKeyDown` manual
- O foco é gerenciado nativamente
- O comportamento de `disabled` funciona

**Nota:** As páginas admin já usam `<button>` corretamente — a home ficou com o padrão antigo.

### 3.4 · Labels de visibilidade sem acento

```tsx
<option value="PUBLIC">Publicas</option>    // Públicas
<option value="PRIVATE">Restritas</option>   // Correto (sem acento)
```

"Públicas" precisa de acento. "Restritas" está correto.

### 3.5 · `HomeItem` com mapeamento redundante

A Home cria um tipo intermediário `HomeItem` para unificar `Link`, `UploadedSchedule` e `Note`. O mapeamento é correto mas tem uma redundância: a home já recebe os objetos completos da API e apenas reempacota os campos necessários. O tipo intermediário poderia ser mais enxuto ou a renderização dos cards poderia trabalhar diretamente com os tipos originais usando type narrowing.

**Impacto:** Baixo — é um custo de legibilidade, não de funcionalidade.

### 3.6 · `noteMap` para lookup de nota original

```typescript
const noteMap = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);
```

Necessário porque `HomeItem` não carrega o conteúdo completo da nota. Ao clicar numa nota, a home precisa do objeto `Note` original para exibir o `content`. O `noteMap` resolve isso, mas é um sinal de que `HomeItem` está incompleto — o campo `content` existe em `HomeItem` mas o modal precisa do objeto `Note` real para ter `imageUrl` e outros campos.

**Avaliação:** Funciona, mas indica que `HomeItem` deveria ou ter todos os campos necessários para o modal, ou a nota deveria ser renderizada diretamente a partir do array `notes` sem o mapeamento intermediário.

### 3.7 · Sem paginação — todos os itens carregados de uma vez

A home faz três chamadas sem `page` ou `limit` na query string. Em produção com centenas de itens, isso pode:
- Aumentar o tempo de resposta inicial significativamente
- Aumentar o payload de memória no cliente
- Degradar a performance de renderização (muitos cards no DOM)

**Hipótese:** O backend já suporta paginação (`page`, `pageSize`) no endpoint `/links/admin/list` — verificar se os outros endpoints também suportam.

### 3.8 · Badge de status no card da home (Check/Ban)

```tsx
<span className="fac-status-badge absolute bottom-3 left-3" data-status={item.status}>
  {item.status === 'ACTIVE' ? (
    <Check className="h-5 w-5" />
  ) : (
    <Ban className="h-5 w-5" />
  )}
</span>
```

O badge de status aparece em todos os cards da home, para todos os usuários — mas itens inativos só são visíveis para SUPERADMIN (que usa `includeInactive: true`). Para um USER comum que nunca vê itens inativos, o badge verde de "ACTIVE" em cada card é ruído visual sem valor.

**Sugestão:** Mostrar o badge apenas quando `isInactive` é verdadeiro (status INACTIVE), não em itens ativos. Ou remover completamente para usuários não-SUPERADMIN.

---

## 4. O que está repetido ou mal distribuído

| Item | Situação |
|---|---|
| `getContrastTextColor` | Local na home — deveria estar em `lib/color.ts` |
| Estados loading/error/empty | Home usa classes ad-hoc; admins usam `fac-*` — inconsistente |
| Card com `<div role="button">` | Padrão antigo; admins já usam `<button>` |
| Lógica de tipo `HomeItem` | Reempacotamento necessário mas poderia ser simplificado |

---

## 5. O que pode ser removido ou simplificado

### `HomeItem` pode ser reduzido

O tipo `HomeItem` tem 13 campos. Após examinar o uso:
- `content` é copiado do `Note` mas o modal abre via `noteMap` usando o objeto `Note` original
- `fileName` está em `HomeItem` mas não é exibido em nenhum lugar no card da home
- `description` está mapeado mas não é renderizado no card

O tipo poderia ser reduzido aos campos realmente usados, ou substituído por um approach de renderização direta com type narrowing nos arrays originais.

### `onKeyDown` no `<div>` pode ser removido

Se o `<div role="button">` for substituído por `<button>`, o `onKeyDown` manual deixa de ser necessário.

### Badge de status em itens ativos

Para usuários não-SUPERADMIN, todos os itens visíveis são `ACTIVE` — o badge verde não agrega informação. Pode ser condicional: `{isInactive && <span className="fac-status-badge">...</span>}`.

---

## 6. Problemas de arquitetura e organização

### 6.1 · Página ainda tem 4 responsabilidades juntas

- Fetch e estado dos três tipos de conteúdo
- Lógica de filtros e busca
- Renderização da grade de cards
- Modal de nota

A diferença das páginas de admin é que aqui não há CRUD — então o peso é menor. Mas com a adição de paginação no futuro, a complexidade do fetch vai crescer.

### 6.2 · Ausência de estado vazio diferenciado

O estado vazio atual ("Nenhum item encontrado.") é o mesmo independente da causa:
- Nenhum item cadastrado no sistema
- Busca sem resultados
- Filtro de tipo/visibilidade/categoria sem correspondência

Para o usuário, a mensagem poderia ser mais específica: "Nenhum resultado para '[busca]'" vs "Nenhum item disponível".

### 6.3 · Ordenação fixa por título

```typescript
return [...mappedLinks, ...mappedSchedules, ...mappedNotes].sort((a, b) =>
  a.title.localeCompare(b.title),
);
```

A ordenação por título é hardcoded. O campo `order` existe nos Links (e presumivelmente nos outros tipos) — nenhum controle de ordenação é exposto ao usuário ou ao SUPERADMIN que configura a ordem.

---

## 7. Referências e padrões externos

### Estados visuais semânticos

Produtos como Vercel, Linear e Notion diferenciam visualmente os estados:
- **Loading:** skeleton/shimmer ou spinner contextual
- **Error:** destaque em vermelho semântico com possibilidade de retry
- **Empty:** ilustração ou ícone + mensagem contextual + CTA quando aplicável

O design system do projeto já tem as classes `fac-loading-state`, `fac-error-state`, `fac-empty-state` para isso — só precisam ser usadas.

### Paginação vs. carga virtual

Para portais de conteúdo, a abordagem mais comum é:
- Paginação clássica (mais simples, menor complexidade)
- Virtualização de lista (melhor performance, maior complexidade)
- Scroll infinito (boa UX mas requer backend com cursor)

Para o Facilita, a paginação clássica é suficiente e consistente com o padrão já usado nos endpoints admin.

---

## 8. O que vamos mudar

1. **Substituir `<div role="button">` por `<button>` no card** — acessibilidade
2. **Usar `fac-loading-state`, `fac-error-state`, `fac-empty-state`** — consistência com design system e tema escuro
3. **Extrair `getContrastTextColor` para `lib/color.ts`** — eliminar função local
4. **Corrigir "Publicas" → "Públicas"** — acentuação
5. **Mostrar badge de status apenas para itens inativos** — reduzir ruído visual
6. **Melhorar mensagem de vazio conforme contexto** — feedback mais preciso

---

## 9. Plano de refatoração

### Etapa 1 — Criar `lib/color.ts` e extrair `getContrastTextColor`

**Arquivo a criar:** `lib/color.ts`

```typescript
export function getContrastTextColor(hexColor: string): string {
  const hex = hexColor.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#263238';
  const value = Number.parseInt(hex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#263238' : '#ffffff';
}
```

Substituir a função local por import. Verificar se a função é usada em outros lugares (busca global por `getContrastTextColor`).

**Impacto:** Mínimo. Comportamento idêntico.

---

### Etapa 2 — Substituir `<div role="button">` por `<button>`

**Arquivo:** `app/(app)/page.tsx`

```tsx
// De:
<div
  className="relative aspect-square overflow-hidden bg-muted cursor-pointer"
  onClick={() => openItem(item)}
  onKeyDown={(event) => { ... }}
  role="button"
  tabIndex={isInactive ? -1 : 0}
>

// Para:
<button
  type="button"
  className="relative aspect-square w-full overflow-hidden bg-muted cursor-pointer text-left"
  onClick={() => openItem(item)}
  disabled={isInactive}
  aria-label={`Abrir ${item.title}`}
>
```

Remover o `onKeyDown` — `<button>` responde a Enter e Space nativamente. Remover o `tabIndex` — use `disabled` para itens inativos (evita foco e click).

**Atenção:** Verificar se o estilo do card muda com `<button>` — pode precisar de `appearance-none` ou reset de estilos de botão para manter o layout visual.

---

### Etapa 3 — Usar classes do design system nos estados

**Arquivo:** `app/(app)/page.tsx`

```tsx
// De (loading):
<div className="fac-panel px-6 py-10 text-center text-[14px] text-muted-foreground">
  Carregando itens...
</div>

// Para:
<div className="fac-loading-state">Carregando itens...</div>

// De (error — problema extra com tema escuro):
<div className="fac-panel border-red-400 bg-red-50 px-6 py-4 text-[14px] text-red-700">
  {error}
</div>

// Para:
<div className="fac-error-state">{error}</div>

// De (empty):
<div className="fac-panel px-6 py-10 text-center text-[14px] text-muted-foreground">
  Nenhum item encontrado.
</div>

// Para:
<div className="fac-empty-state">
  {globalSearch.trim() ? `Nenhum resultado para "${globalSearch.trim()}"` : 'Nenhum item encontrado.'}
</div>
```

**Impacto:** Melhoria visual + fix de tema escuro no estado de erro. Sem risco de regressão.

---

### Etapa 4 — Badge de status condicional

**Arquivo:** `app/(app)/page.tsx`

```tsx
// De: sempre exibido
<span className="fac-status-badge absolute bottom-3 left-3" data-status={item.status}>
  {item.status === 'ACTIVE' ? (
    <Check className="h-5 w-5" />
  ) : (
    <Ban className="h-5 w-5" />
  )}
</span>

// Para: apenas para inativos
{isInactive ? (
  <span className="fac-status-badge absolute bottom-3 left-3" data-status="INACTIVE">
    <Ban className="h-5 w-5" />
  </span>
) : null}
```

Remove o ícone de Check verde de todos os cards ativos. O usuário sabe que se o item está na lista, está ativo — o badge verde não agrega.

---

### Etapa 5 — Corrigir acentuação

**Arquivo:** `app/(app)/page.tsx`

- `"Publicas"` → `"Públicas"` (linha da option do select de visibilidade)

---

## 10. Estrutura sugerida após refatoração

```
v2/frontend/src/
├── lib/
│   ├── color.ts      ← NOVO: getContrastTextColor
│   ├── image.ts      ← existente
│   └── error.ts      ← existente
└── app/(app)/
    └── page.tsx      ← refatorada: button, fac-* states, lib/color.ts
```

---

## 11. Checklist de implementação

### Etapa 1 — lib/color.ts
- [x] Criar `lib/color.ts` com `getContrastTextColor`
- [x] Substituir a função local na home pelo import
- [x] Buscar globalmente por `getContrastTextColor` — verificar se está duplicado em outro lugar
- [ ] Verificar que a cor das pills de categoria continua correta

### Etapa 2 — button acessível
- [x] Substituir `<div role="button">` por `<button type="button">`
- [x] Remover `onKeyDown` manual
- [x] Adicionar `disabled={isInactive}` no botão
- [x] Adicionar `aria-label={`Abrir ${item.title}`}`
- [x] Remover `tabIndex` (desnecessário com `<button>`)
- [ ] Verificar layout do card — especialmente `aspect-square` e `overflow-hidden`
- [ ] Testar navegação por teclado (Tab → Enter → abre item)

### Etapa 3 — design system states
- [x] Substituir loading div por `<div className="fac-loading-state">`
- [x] Substituir error div por `<div className="fac-error-state">`
- [x] Substituir empty div por `<div className="fac-empty-state">` com mensagem contextual
- [ ] Verificar visualmente no tema claro e no tema escuro

### Etapa 4 — badge condicional
- [x] Remover `<Check>` do badge de status
- [x] Tornar o badge condicional para `isInactive` apenas
- [ ] Verificar que o layout do card não quebrou sem o badge em todos os cards

### Etapa 5 — acentuação
- [x] Corrigir "Publicas" → "Públicas"

---

## 11.1. Ajuste complementar desta rodada

- [x] Reintroduzir o CTA de login para visitantes no cabeÃ§alho da home (`/login`)

---

## 12. Riscos e cuidados

| Risco | Probabilidade | Mitigação |
|---|---|---|
| `<button>` quebrando o `aspect-square` do card | Média | Testar e adicionar `w-full` se necessário |
| `disabled` em `<button>` impedindo o FavoriteButton de funcionar | Média | O `FavoriteButton` está dentro do card mas em outro elemento — `disabled` no wrapper não afeta botões internos |
| Remover badge verde alterar a percepção visual do card | Baixa | A distinção visual dos inativos já é feita por `grayscale + opacity` |
| `fac-error-state` ter estilo diferente do esperado | Baixa | Conferir a definição no CSS antes de aplicar |

**Nota sobre paginação (não neste ciclo):** A ausência de paginação é uma dívida técnica real, mas a implementação requer mudanças no backend (verificar suporte a `page`/`limit` nos endpoints `/links`, `/schedules`, `/notes` para usuário comum), no estado da home (adicionar `page`, `total`), e no componente de paginação. Documentar como próxima etapa mas não bloquear a refatoração atual por isso.
