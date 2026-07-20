# Compartilhados

> Arquivo: `v2/frontend/src/app/(app)/compartilhados/page.tsx`
> Linhas: ~350
> Atualizado em: 2026-04-02

---

## 1. Resumo executivo

A página de compartilhados era a mais pesada do grupo do portal porque duplicava o card inteiro entre as seções de recebidos e enviados, além de ainda usar o padrão antigo de card clicável. Nesta rodada a estrutura foi consolidada em um `ShareCard` local, com os mesmos ajustes já aplicados em home e favoritos: botão acessível, overlay externo para ações, badge só para itens inativos e estados visuais padronizados.

**Nível de prioridade:** Média

---

## 2. O que foi melhorado

- Extração de um `ShareCard` local para eliminar a duplicação entre recebidos e enviados
- Migração de `<div role="button">` para `<button type="button">`
- Remoção de `onKeyDown` manual
- `FavoriteButton` e download movidos para fora da área clicável do card
- Remoção do `Check` e manutenção do badge apenas para itens inativos
- Remoção da variável intermediária `imageUrl`
- Correção de `Destinatário` e `Usuário`
- Padronização dos estados com `fac-loading-state`, `fac-error-state` e `fac-empty-state`

---

## 3. Decisão de implementação

Em vez de criar um componente global novo, a extração foi feita como componente local no mesmo arquivo. Isso reduz repetição sem espalhar uma abstração que, por enquanto, só é necessária nesta página.

O `FavoriteButton` já faz `stopPropagation` internamente, mas ele foi mantido fora do botão principal para alinhar a arquitetura visual e evitar depender desse detalhe interno do componente.

---

## 4. O que mudou no código

### Etapa 1 — ShareCard local

Foi criado um componente local com props para:

- `variant: 'received' | 'sent'`
- `processingId`
- `localCategories`
- `onOpen`
- `onRemove`
- `onRevoke`
- `onUpdateCategory`

Com isso, os dois `map` da página passaram a apenas instanciar `<ShareCard />` com as props específicas de cada seção.

### Etapa 2 — Estados

Os estados visuais foram padronizados:

```tsx
<div className="fac-loading-state">Carregando compartilhamentos...</div>
<div className="fac-error-state">{error}</div>
<div className="fac-empty-state">Nenhum item recebido.</div>
<div className="fac-empty-state">Nenhum item enviado.</div>
```

---

## 5. Checklist de implementação

### Etapa 1 — ShareCard local
- [x] Criar função `ShareCard` no mesmo arquivo, antes do componente principal
- [x] Migrar para `<button type="button">` com `disabled={isInactive}` e `aria-label`
- [x] Remover `onKeyDown` manual
- [x] Mover `FavoriteButton` e botão de download para fora do `<button>` com `pointer-events-none`/`pointer-events-auto`
- [x] Remover `event.stopPropagation()` do download
- [x] Badge condicional para `isInactive` apenas
- [x] Remover `Check` do fluxo e do import
- [x] Remover `imageUrl` intermediário e usar `src={getShareImage(share)}`
- [x] Corrigir `Destinatario` → `Destinatário` e `Usuario` → `Usuário`
- [x] Substituir os dois `map` inline pelos dois `<ShareCard>` com as props corretas

### Etapa 2 — Estados
- [x] Substituir loading por `<div className="fac-loading-state">`
- [x] Substituir error por `<div className="fac-error-state">`
- [x] Substituir empty de recebidos por `<div className="fac-empty-state">`
- [x] Substituir empty de enviados por `<div className="fac-empty-state">`

### Etapa 3 — Validação
- [x] Rodar lint focado na página
- [ ] Validar visualmente os dois painéis no navegador

---

## 6. Riscos e cuidados

| Risco | Probabilidade | Mitigação |
|---|---|---|
| O layout do card mudar após a extração | Baixa | O `ShareCard` preserva a mesma estrutura visual do card anterior |
| `ContentCoverImage` não aceitar `null` | Baixa | O componente já recebe `null` em outras páginas do portal |
| Diferença comportamental entre recebidos e enviados | Baixa | O `variant` isola somente os trechos realmente diferentes |
