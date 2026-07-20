# Backend — Checklist 5: Backups e Resets

> Arquivos a alterar:
> - `v2/backend/src/backups/backup-scheduler.service.ts`
> - `v2/backend/src/resets/resets.service.ts`
>
> Atualizado em: 2026-04-03

---

## Resumo

Dois problemas independentes:
1. `BackupSchedulerService` usa `console.log/warn/error` em vez do `Logger` do NestJS
2. `ResetsService` duplica a lógica de seed de superadmin e permissões que já existe no `BootstrapService`

---

## Parte A — `BackupSchedulerService`: substituir console por Logger

### A1 — Adicionar Logger

O serviço tem 7 chamadas a `console.log`, 1 a `console.warn` e 1 a `console.error`. O padrão NestJS é usar `Logger` do `@nestjs/common`, que inclui timestamp, nível de log e contexto automaticamente, e integra com qualquer transport configurado.

Adicionar no topo da classe:

```typescript
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Injectable()
export class BackupSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupSchedulerService.name);
  // ...
}
```

### A2 — Substituir as chamadas

| Linha atual | Substituir por |
|---|---|
| `console.log('[BackupScheduler] Verificando: ...')` | `this.logger.debug('Verificando: ...')` |
| `console.warn('[BackupScheduler] Horario invalido: ...')` | `this.logger.warn('Horário inválido: ...')` |
| `console.log('[BackupScheduler] Iniciando backup automatico...')` | `this.logger.log('Iniciando backup automático...')` |
| `console.error('[BackupScheduler] Falha ao executar backup automatico:', error)` | `this.logger.error('Falha ao executar backup automático', error instanceof Error ? error.stack : String(error))` |
| `console.log('[BackupScheduler] Backup automatico concluido com sucesso.')` | `this.logger.log('Backup automático concluído com sucesso.')` |
| `console.log('[BackupScheduler] Diretorio: ...')` | `this.logger.debug('Diretório: ...')` |
| `console.log('[BackupScheduler] Arquivo criado: ...')` | `this.logger.log('Arquivo criado: ...')` |
| `console.log('[BackupScheduler] ${deleted} backups antigos removidos.')` | `this.logger.log('${deleted} backups antigos removidos.')` |

O prefixo `[BackupScheduler]` nas mensagens pode ser removido — o `Logger` já inclui o nome da classe como contexto.

Aproveitar para corrigir os acentos nas mensagens de log:
- `'backup automatico'` → `'backup automático'`
- `'Horario invalido'` → `'Horário inválido'`
- `'Iniciando'`, `'concluido'` → `'concluído'`
- `'Diretorio'` → `'Diretório'`

- [ ] `Logger` importado de `@nestjs/common`
- [ ] `private readonly logger = new Logger(BackupSchedulerService.name)` adicionado
- [ ] Todas as chamadas `console.*` substituídas por `this.logger.*`
- [ ] Prefixo `[BackupScheduler]` removido das mensagens
- [ ] Acentos corrigidos nas mensagens de log

---

## Parte B — `ResetsService`: eliminar duplicação de seed

### B1 — O problema

`ResetsService` contém dois métodos privados:
- `seedSuperAdmin(tx)` — upsert do superadmin
- `seedRolePermissions(tx)` — upsert das permissões padrão de cada role

Esses dois métodos duplicam exatamente a lógica que já existe em `BootstrapService`. Qualquer mudança nas permissões padrão precisa ser feita em dois lugares.

### B2 — Solução: injetar `BootstrapService`

`BootstrapService` já tem a lógica de seed. A solução mais simples é fazer `ResetsService` injetar `BootstrapService` e chamar os métodos públicos já existentes em vez de reimplementar o seed.

**Verificar antes:** ler `v2/backend/src/bootstrap/bootstrap.service.ts` e confirmar que ele tem métodos públicos ou extraíveis para `seedSuperAdmin` e `seedRolePermissions`. Se os métodos forem privados, torná-los públicos ou criar métodos públicos que os chamem.

**Verificar também:** o `BootstrapService` opera fora de transação. Se o `ResetsService` precisa do seed dentro da transação Prisma (para atomicidade), a abordagem muda — nesse caso, o seed deve ser extraído para um módulo utilitário compartilhado (`SeedService` ou similar) que aceite tanto `PrismaService` quanto `Prisma.TransactionClient`.

- [ ] Ler `v2/backend/src/bootstrap/bootstrap.service.ts` para entender como o seed está estruturado
- [ ] Decidir abordagem:
  - **Opção A** (se o seed não precisa estar dentro da transação): injetar `BootstrapService` em `ResetsService` e chamar seus métodos
  - **Opção B** (se precisa de transação): extrair um `SeedHelperService` em `common/` que aceite `tx` como parâmetro
- [ ] Implementar a opção escolhida
- [ ] Remover `seedSuperAdmin` de `ResetsService`
- [ ] Remover `seedRolePermissions` de `ResetsService`
- [ ] Importar `BootstrapModule` (ou `CommonModule`) em `ResetsModule` se necessário
- [ ] `bcrypt` removido do import de `ResetsService` se não for mais necessário

### B3 — Acentos nas strings do `ResetsService`

As mensagens de notificação do sistema de backup automático têm acentos faltando. Verificar se há strings similares no `ResetsService` — não há mensagens visíveis ao usuário neste serviço além dos seeds, então não há alterações de texto necessárias aqui.

---

## Validação final

- [ ] `npm run build` sem erros
- [ ] Executar um reset seletivo (ex.: apenas `categories`) e confirmar que funciona
- [ ] Executar um reset completo e confirmar que o superadmin é recriado corretamente
- [ ] Verificar nos logs do servidor que o `BackupSchedulerService` agora aparece com o formato padrão do NestJS Logger
