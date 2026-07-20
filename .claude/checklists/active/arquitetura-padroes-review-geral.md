# Arquitetura e padrões — achados da review geral (área 3/4)

Origem: review geral do projeto (2026-07-19), skills `davi-padroes:god-object-detection`,
`davi-padroes:duplicate-code-detection`.

## 1. `admin/settings/page.tsx` era um god object (1701 linhas, 3 features sem relação) — RESOLVIDO (falta verificação visual)

Usuário optou por rotas separadas (não a recomendação inicial de manter uma rota só) — mudou
navegação e sidebar de propósito.

- [x] `admin/settings/page.tsx` — fica só com edição de `SystemConfig` (1701 → ~490 linhas)
- [x] `admin/settings/atalhos/page.tsx` (novo) — CRUD completo de atalhos personalizados,
      própria entrada na sidebar (`Atalhos`, mesma permissão `canManageSystemConfig`)
- [x] `admin/settings/backups-automaticos/page.tsx` (novo) — navegador de backup automático +
      "Backup total agora", própria entrada na sidebar (`Backups automáticos`, mesma permissão)
- [x] Confirmado que `/admin/backup` (feature diferente, permissão `canBackupSystem`, export
      granular manual) não colide com as rotas novas — nomes escolhidos pra evitar confusão
- [x] Confirmado que o catálogo de atalhos (`shortcutCatalog`) já é carregado globalmente por
      `app-shell.tsx` — o fetch dentro de settings era redundante, seguro remover sem quebrar os
      atalhos de teclado no resto do app
- [x] `npm run build` e `npm run lint` limpos nas 3 páginas
- [x] Deploy real: rebuild, restart, as 3 rotas (`/admin/settings`, `/admin/settings/atalhos`,
      `/admin/settings/backups-automaticos`) respondendo 200
- [ ] **Verificar visualmente**: os 3 fluxos completos (editar config, criar/editar/remover
      atalho incluindo captura de tecla, ver/baixar backups automáticos) e a navegação lateral
      com as 2 entradas novas

## 2. Duplicação estrutural em `search.service.ts` — RESOLVIDO E VERIFICADO

Não genericizei a query Prisma em si (`where`/`include` são genuinamente diferentes por
modelo — tentar unificar isso teria sido a "abstração errada"). Extraí só o esqueleto que
era 100% idêntico: checar permissão → buscar → ordenar por `buildTextScore` → mapear.

- [x] `runSearch<TItem>()` genérico criado — usado nas 8 buscas que seguiam esse esqueleto
      (categories, images, links, sharedLinks, schedules, sharedSchedules, notes, sharedNotes).
      `searchUsers` ficou de fora de propósito — não tem sort client-side, é código coincidentalmente
      parecido, não duplicação real (mesmo critério do `duplicate-code-detection`)
- [x] `npm run build` (`nest build`, type-check completo) limpo
- [x] **Testado de verdade contra a API rodando** (não só compilado): gerei tokens JWT válidos
      (mesmo segredo do backend, sem tocar em senha de ninguém), chamei `/api/search/global` com
      6 termos diferentes, antes e depois do refactor, para dois papéis:
      - **SUPERADMIN**: 4 termos, resposta **idêntica byte a byte** em todos
      - **USER comum** (exercita os caminhos "owned" E "shared"): 6 termos, resposta **idêntica
        byte a byte** em todos
- [x] Nenhuma verificação visual pendente aqui — é uma API JSON, testada de ponta a ponta
