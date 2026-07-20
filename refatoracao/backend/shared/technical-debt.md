# Backend — Dívidas Técnicas

> Atualizado em: 2026-04-02

---

## 1. Resumo executivo

O backend não tem problemas críticos de funcionamento. As dívidas identificadas são de qualidade de código, consistência e robustez — melhorias que reduzem a superfície de bugs futuros e facilitam manutenção. Nenhum item abaixo representa um bug em produção.

**Nível de prioridade:** Média

---

## 2. Sem filtro global de exceções

O NestJS tem um `ExceptionFilter` built-in que captura exceções conhecidas (`HttpException`) e retorna a resposta correta. Para exceções desconhecidas (erros de runtime, `TypeError`, `PrismaClientKnownRequestError` não tratado), ele retorna `500 Internal Server Error` com a mensagem padrão do NestJS — o que pode vazar stack traces em desenvolvimento ou mensagens genéricas em produção.

**Problema concreto:** Se uma query Prisma lançar `PrismaClientKnownRequestError` (ex.: violação de constraint `unique` não antecipada em algum serviço), o cliente recebe um JSON `{ statusCode: 500, message: 'Internal server error' }` sem informação útil.

**Solução:** Criar um `AllExceptionsFilter` que capture `PrismaClientKnownRequestError` e mapeie códigos conhecidos para respostas HTTP adequadas:

```typescript
// v2/backend/src/common/filters/all-exceptions.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        // unique constraint violation
        return res.status(409).json({ message: 'Registro já existe' });
      }
      if (exception.code === 'P2025') {
        // record not found (quando usamos update/delete sem findFirst antes)
        return res.status(404).json({ message: 'Registro não encontrado' });
      }
    }
    // outros erros: 500 com log
  }
}
```

Registrar em `main.ts` com `app.useGlobalFilters(new AllExceptionsFilter())`.

---

## 3. `UsersService.update` e `updateProfile` são quase idênticos

`update()` é usado pelo admin (pode alterar role, status, password). `updateProfile()` é usado pelo próprio usuário (pode alterar name, username, avatar, theme, password). A lógica de verificação de email duplicado e o hash de senha são idênticos nos dois métodos.

**Problema:** Qualquer mudança na lógica de atualização (ex.: validação adicional, novo campo) precisa ser feita nos dois lugares.

**Solução:** Extrair um método privado `buildUserUpdateData(current, data)` que aplica as mudanças comuns. Ambos os métodos públicos chamam esse helper e adicionam apenas o que é exclusivo de cada um.

---

## 4. `findAll` e `findAllPaginated` nos serviços de conteúdo

Os três serviços de conteúdo têm dois métodos de listagem separados:
- `findAll(viewer?, filters?)` — retorna todos os itens, usado pelo portal do usuário
- `findAllPaginated(filters, pagination?)` — retorna `{ items, total }`, usado pelo admin

O `findAllPaginated` não recebe `viewer` — ele assume sempre acesso de admin. Isso é correto, mas a lógica de construção da query `where` está duplicada entre os dois métodos dentro do mesmo serviço.

**Solução:** Extrair um método privado `buildWhereClause(viewer?, filters?)` que retorna o `where` do Prisma. Ambos os métodos o chamam. O `findAllPaginated` passa um viewer fixo de SUPERADMIN ou simplesmente passa `undefined` para o viewer (que no contexto de admin já filtra diferente).

---

## 5. Ausência de DTOs para query parameters

Os controllers recebem query parameters diretamente como `@Query('search') search?: string` sem validação via DTO. Isso significa que qualquer string chega ao serviço sem validação de tipo ou sanitização prévia.

**Impacto atual:** Baixo, porque os serviços já fazem `.trim()` internamente e passam para Prisma com `contains`. Prisma sanitiza contra SQL injection. Mas um `@Query('skip') skip` passado como `'abc'` chegaria como string para `parsePagination()`.

**Solução parcial já existente:** `parsePagination()` em `common/utils/pagination.ts` já faz `parseInt` com fallback. Mas o padrão seria ter `FindAllQueryDto` com `@IsOptional() @IsInt() @Min(0) @Type(() => Number) skip?: number`.

**Recomendação:** Baixa prioridade — criar query DTOs apenas se a API for exposta externamente ou se bugs de tipo forem reportados.

---

## 6. Erros de autenticação com mensagem genérica em inglês

Os erros de autenticação (`AuthService`) retornam mensagens em inglês:
- `'Invalid credentials'`
- `'Refresh token missing'`
- `'Refresh token invalid'`
- `'User not found'`

Todo o resto da aplicação retorna mensagens em português (`'Category not authorized'` é a exceção — também em inglês nos serviços de conteúdo).

**Recomendação:** Padronizar todas as mensagens de erro para português, ou documentar que o frontend traduz as mensagens da API. Se o frontend exibir essas strings diretamente ao usuário, a inconsistência de idioma será visível.

---

## 7. Mensagem de erro nos serviços de conteúdo em inglês

Os serviços de conteúdo lançam:
- `'Category not authorized'`
- `'Document not authorized'`
- `throw new NotFoundException('Schedule with ID ${id} not found')`

Isso é inconsistente com os padrões do resto da API. Se o frontend não intercepta e traduz, essas mensagens aparecem ao usuário em inglês.

**Solução:** Padronizar para português (`'Categoria não autorizada'`, `'Documento não autorizado'`, `'Documento não encontrado'`).

---

## 8. `findPublicByToken` nos serviços de conteúdo retorna objeto diferente

`findPublicByToken` não usa `this.include` completo — usa um include personalizado sem `shares` e sem `_count`. Isso significa que o retorno desse método tem forma diferente dos outros métodos, o que pode causar confusão em consumidores da API que esperam o mesmo shape.

**Impacto:** Baixo — o endpoint público provavelmente não precisa de metadados de compartilhamento. Mas deveria ser documentado ou ter um tipo de retorno explícito.

---

## 9. `activate`/`deactivate` como métodos separados

(Documentado também em `repeated-patterns.md`)

Os três serviços têm `activate()` e `deactivate()` como métodos distintos, mas são a mesma operação com um parâmetro diferente. Isso duplica lógica dentro do próprio serviço (não apenas entre serviços).

**Solução:** `setStatus(id, actor, status: EntityStatus)` — ver `repeated-patterns.md` Etapa 2.

---

## 10. Checklist de implementação

### Alta prioridade
- [ ] Criar `AllExceptionsFilter` para capturar erros Prisma não tratados (item 2)
- [ ] Consultar `repeated-patterns.md` para a deduplicação dos serviços de conteúdo

### Média prioridade
- [ ] Refatorar `UsersService.update` e `updateProfile` para compartilhar `buildUserUpdateData` (item 3)
- [ ] Padronizar mensagens de erro para português nos serviços de conteúdo e auth (itens 6 e 7)
- [ ] Extrair `buildWhereClause` dentro de cada serviço de conteúdo (item 4)

### Baixa prioridade
- [ ] Avaliar criação de query DTOs para endpoints com múltiplos query params (item 5)
- [ ] Documentar ou tipar o retorno diferente de `findPublicByToken` (item 8)
