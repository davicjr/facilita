# Backend — ResetsService: reusar seed do BootstrapService — DECISÃO: NÃO UNIFICAR

Origem: `refatoracao/backend/checklist-5-backups-resets.md`.

## Decisão tomada (com leitura completa dos dois arquivos)

O checklist original partia da premissa de que `ResetsService` duplica lógica que já existe em
`BootstrapService` e deveria reusá-la. Lendo os dois com atenção, **isso não é verdade** — são
parecidos, não duplicados:

- `BootstrapService.ensureRolePermissions()`: **pula** roles que já existem (`if (existingRoles.has(...)) continue`)
  — semântica de "preencher só o que falta", pensada pro primeiro boot, sem mexer em customização
- `ResetsService.seedRolePermissions()`: faz **upsert forçando os valores default**, mesmo se já
  existir customização — é literalmente o propósito do reset (voltar ao estado original)
- `BootstrapService.ensureInitialSuperAdmin()`: idempotente via uma flag
  (`INITIAL_SUPERADMIN_BOOTSTRAP_KEY`) + contagem de usuários, e abre sua **própria** transação
  interna — não aceita um `tx` externo
- `ResetsService.seedSuperAdmin()`: precisa rodar **dentro da mesma transação** do `deleteMany`
  pra manter atomicidade (se o processo cair no meio, não pode sobrar um banco limpo sem superadmin)

Forçar esses dois a compartilhar código teria sido a "abstração errada" — dois comportamentos
diferentes (preencher-lacuna vs forçar-default; boot idempotente vs reset atômico) espremidos numa
função só, com flags pra diferenciar os casos. Aplicando o mesmo critério do
`davi-padroes:duplicate-code-detection` usado na review geral (área 3): parecido não é igual.

## O que foi feito

- [x] Comentário adicionado em `resets.service.ts` explicando a decisão, pra uma sessão futura não
      achar de novo que isso é duplicação acidental esperando ser unificada
- [x] `npm run build` limpo
- [x] Nenhuma mudança de comportamento — não toquei na lógica de `seedRolePermissions`/`seedSuperAdmin`

## Não feito de propósito

- [ ] **Não executei um reset real** (nem seletivo nem completo) contra o banco rodando — destruiria
      dados de teste reais construídos ao longo desta sessão (usuários `*.teste`, links, notas,
      compartilhamentos, favoritos). Reset é uma operação destrutiva; rodar isso exige sua
      confirmação explícita antes, não é algo pra eu decidir sozinho só porque um checklist pede
      "confirmar que funciona"
- [ ] Se quiser essa verificação: eu rodo um reset seletivo de uma entidade vazia/de baixo risco
      (ex.: `notifications`) primeiro, com sua aprovação
