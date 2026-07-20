# Login

> Arquivo: `v2/frontend/src/app/(auth)/login/page.tsx`
> Linhas: ~110
> Atualizado em: 2026-04-02

---

## 1. Resumo executivo

A tela de login continua pequena, limpa e funcional. O fluxo principal já estava correto; nesta rodada foram corrigidos os textos sem acento e adicionados os atributos `autoComplete` para melhorar integração com browser e gerenciadores de senha. O ponto que existia no documento sobre o link "Voltar para a página inicial" ficou desatualizado: hoje `/` já é uma home pública, então o link pode permanecer.

**Nível de prioridade:** Baixa

---

## 2. O que está bom

- Estado mínimo e direto: `username`, `password` e `loading`
- `setAuth` seguido de `router.push('/')` após sucesso
- Erro delegado ao interceptor da API de forma intencional
- Botão de submit protegido com `disabled={loading}`
- Labels com `htmlFor` e validação HTML5 com `required`
- Animação de entrada simples e consistente com `motion-stagger`
- Link de volta para `/` agora é válido porque a home é pública

---

## 3. O que foi ajustado

### 3.1 · Acentuação

Foram corrigidos:

- `Voltar para a pagina inicial` → `Voltar para a página inicial`
- `Use seu usuario...` → `Use seu usuário...`
- `Usuario` → `Usuário`

### 3.2 · Autocomplete

Os inputs agora usam os atributos corretos:

```tsx
<input type="text" autoComplete="username" />
<input type="password" autoComplete="current-password" />
```

Isso melhora autofill, salvamento de senha e compatibilidade com gerenciadores de credenciais.

### 3.3 · Link de volta

O problema descrito anteriormente não se aplica mais ao estado atual do projeto. Como `/` hoje renderiza a home pública do portal, o link pode permanecer sem causar loop de navegação.

---

## 4. O que não precisa mudar

- Não há necessidade de trocar os inputs para `fac-input`; a tela de auth tem estilo próprio
- Não há necessidade de alterar o fluxo de submit
- Não há necessidade de remover o link de volta enquanto `/` continuar pública

---

## 5. O que foi feito

1. Corrigir os textos com acentuação
2. Adicionar `autoComplete="username"` no input de usuário
3. Adicionar `autoComplete="current-password"` no input de senha
4. Manter o link de volta para `/` e alinhar a documentação à arquitetura atual

---

## 6. Checklist de implementação

### Etapa 1 — Acentuação
- [x] Corrigir `'pagina inicial'` → `'página inicial'`
- [x] Corrigir `'usuario'` → `'usuário'` no label
- [x] Corrigir `'usuario'` → `'usuário'` na descrição

### Etapa 2 — autocomplete
- [x] Adicionar `autoComplete="username"` no input de usuário
- [x] Adicionar `autoComplete="current-password"` no input de senha
- [ ] Testar preenchimento automático no browser e/ou gerenciador de senha

### Etapa 3 — Link
- [x] Validar que o `<Link href="/">` pode permanecer porque `/` é pública
- [ ] Verificar manualmente a navegação `/login` → `/`

---

## 7. Riscos e cuidados

| Risco | Probabilidade | Mitigação |
|---|---|---|
| `autoComplete` não ser reconhecido por algum navegador antigo | Baixa | É atributo HTML nativo e seguro |
| A home `/` voltar a ser protegida no futuro e invalidar o link | Média | Se a arquitetura mudar, revisar este item e remover o link |
| Alterações apenas visuais não serem validadas em browser real | Média | Manter os checks manuais abertos |
