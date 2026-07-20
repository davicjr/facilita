# Frontend — achados da review geral (área 2/4: Next.js/React)

Origem: review geral do projeto (2026-07-19), skills `davi-frontend:component-decomposition`,
`accessibility-audit`, `design-system-audit`, `form-architecture`.

## 1. Duplicação de JSX nos 3 CRUDs admin — RESOLVIDO (falta verificação visual), com decisão de escopo diferente do sugerido

O `00-index.md` original sugeria um único componente de modal genérico parametrizável pelas 3
abas BASIC/VISUAL. Decidi **não fazer isso** — os campos da aba BASIC são genuinamente diferentes
(input de URL vs upload de arquivo vs editor rico), forçar isso num componente só criaria a
"abstração errada" que o próprio `davi-padroes:duplicate-code-detection` desaconselha. Extraí só
o que é o mesmo conceito de verdade:

- [x] `hooks/use-content-form.ts` — estado de form, validação, save/remove, abrir por URL
      (`?edit=`), tudo que era ~100% idêntico nas 3 páginas
- [x] `components/admin/content-image-position-controls.tsx` — sliders de largura/altura/zoom
      (100% idênticos nas 3, extração mecânica)
- [x] `components/admin/content-share-panel.tsx` — bloco de compartilhamento (quase idêntico,
      só o texto de "não salvo ainda" varia por entidade — passado como prop)
- [x] Aplicado em `admin/links` (634→~430 linhas), `admin/schedules` (625→~440), `admin/notes` (614→~430)
- [x] `npm run build` e `npm run lint` limpos após cada uma das 3 páginas — zero erros novos
- [x] Deploy real: rebuild da imagem, restart do container, `/admin/links`, `/admin/schedules`,
      `/admin/notes` todos respondendo 200
- [ ] **Verificar visualmente**: fluxo completo nas 3 páginas (criar, editar, ativar/desativar,
      remover, compartilhar) — esta sessão não tem navegador pra confirmar que o comportamento é
      idêntico ao anterior, só que compila e serve as rotas

## 2. Labels de formulário sem associação programática — RESOLVIDO nos CRUDs principais, sobra em categories

Login e settings já usavam `htmlFor` corretamente (verifiquei, não faziam parte do problema).

- [x] `admin/links`, `admin/schedules`, `admin/notes` — `id`/`htmlFor` em todos os campos reais
      (título, url, descrição, categoria, arquivo). Para `FileDropzone` e `RichTextEditor`
      (que não são `<input>` simples), adicionei prop `id`/`ariaLabelledBy` nos componentes pra
      permitir a associação de verdade, não só um `id` decorativo no label
- [x] `admin/categories` — campo "Nome" corrigido (`id="category-name"` + `htmlFor`)
- [ ] `admin/categories` — campos "Ícone", "Cor" e "Permissão" **não corrigidos**: usam
      `IconPicker`, `ColorPicker` (componentes customizados, não investiguei os internals) e um
      toggle de dois botões (não é um control tradicional de formulário — precisa de
      `role="group"` + `aria-labelledby`, não só `htmlFor`). Ficou de fora por exigir mexer em
      componentes que eu não tinha certeza do funcionamento interno, sem navegador pra confirmar
- [x] `npm run build` limpo, deploy real, `/admin/categories` respondendo 200
- [ ] **Verificar com leitor de tela** (ou DevTools > Accessibility tree) que os rótulos corrigidos
      são anunciados corretamente ao focar os campos

## 3. `window.confirm()` sobrevivendo no chat — RESOLVIDO (falta verificação visual)

- [x] `chat-room-view.tsx` — substituído por `ConfirmModal` (mesmo padrão usado em outros 9
      lugares), com estado de loading e tratamento de erro preservados
- [x] `npm run build` limpo com a mudança
- [ ] **Verificar visualmente**: abrir uma conversa, apagar, confirmar que o modal aparece e
      funciona igual ao `window.confirm` anterior (esta sessão não tem navegador pra testar)

## 4. Classes indefinidas em `globals.css` — RESOLVIDO (falta verificação visual), achado maior do que o registrado originalmente

Ao investigar, `image-gallery.tsx` tinha **4** classes indefinidas, não 1: `modal-root`,
`modal-backdrop`, `modal-panel` e `surface-strong` — faltava o prefixo `fac-` nas três primeiras,
e `surface-strong` não existe. Resultado real: **o painel do modal de galeria estava renderizando
sem fundo, borda ou sombra nenhuma**, não só com um nome de classe "errado" cosmético.

- [x] `image-gallery.tsx` — `modal-root`→`fac-modal-root`, `modal-backdrop`→`fac-modal-backdrop`,
      `surface-strong modal-panel`→`fac-modal-panel` (que já define fundo/borda/sombra)
- [x] Adicionado `!max-w-5xl` (com `!important`) no painel da galeria — `fac-modal-panel` tem seu
      próprio `max-w-[760px]` no mesmo layer Tailwind (`@layer utilities`), que poderia vencer a
      cascata e estreitar a galeria; forcei a largura maior pra não arriscar
- [x] `backup-selection.tsx` — `surface` → `fac-panel`
- [x] `npm run build` limpo com as duas mudanças
- [ ] **Verificar visualmente**: abrir a galeria de imagens (fundo/borda/sombra do modal e grid
      de imagens na largura certa) e a página de backup (painel com fundo visível)

## 5. Validação de formulário só no submit, nunca no blur — RESOLVIDO (falta verificação visual)

- [x] `useContentForm` expõe `touched` + `handleFieldBlur` — erro só aparece depois que o campo
      foi visitado (`onBlur`) E tem erro; nunca antes disso, mesmo com o form inteiro validado no
      submit (padrão: nunca errar campo que o usuário ainda não visitou)
- [x] Aplicado nos campos de texto reais das 3 páginas (título, url, descrição/conteúdo, arquivo)
- [x] `npm run build` limpo
- [ ] **Verificar visualmente**: sair de um campo obrigatório vazio deve mostrar erro na hora,
      sem precisar clicar em Salvar
