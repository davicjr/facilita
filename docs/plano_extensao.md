# Plano: Extensão Facilita para Navegadores

## 1. Visão Geral

### Conceito
Extensão de navegador (Chrome, Edge, Firefox) que transforma o Facilita em uma ferramenta de acesso instantâneo a links, documentos e recursos, acessível de qualquer lugar através de login na nuvem.

### Proposta de Valor
- **Acesso instantâneo**: Links e documentos a 1 clique de distância
- **Multiplataforma**: Mesma conta em qualquer computador
- **Produtividade**: Não precisa abrir o portal completo para ações simples
- **Captura rápida**: Salvar qualquer link da web direto no Facilita
- **Sempre disponível**: Ícone fixo na barra do navegador

---

## 2. Funcionalidades

### 2.1 Core Features (MVP)

#### Autenticação
- **Login tradicional**: Email + senha (mesma conta do portal web)
- **OAuth Social**: Login com Google, Microsoft, GitHub
- **Persistência**: Manter sessão ativa entre fechamentos do navegador
- **Logout**: Desconectar da extensão
- **Token refresh**: Renovação automática da sessão sem re-login

#### Popup Principal
- **Ícone na toolbar**: Acesso rápido ao clicar
- **Busca inteligente**:
  - Buscar entre todos os links do usuário
  - Autocomplete com resultados instantâneos
  - Destacar matches
- **Lista de favoritos**:
  - Exibir links favoritados
  - Abrir link em nova aba ou atual
  - Star/unstar direto do popup
- **Links recentes**: Últimos 5-10 links acessados
- **Categorias**: Filtrar links por categoria

#### Gerenciamento de Links
- **Adicionar link atual**:
  - Botão "Salvar página atual"
  - Auto-captura título, URL e favicon
  - Escolher categoria
  - Definir cor/descrição
- **Edição rápida**: Editar título/descrição de links existentes
- **Exclusão**: Remover links
- **Organização**: Mover entre categorias

#### Sincronização
- **Cloud sync**: Dados sincronizados com backend do Facilita
- **Multi-device**: Mesmos favoritos em todos os dispositivos
- **Cache local**: Armazenar dados offline para acesso rápido

### 2.2 Features Intermediárias

#### Sidebar Permanente
- **Painel lateral**: Abrir sidebar fixa na lateral do navegador
- **Navegação completa**: Todos os links organizados por categoria
- **Arrastar e soltar**: Reorganizar links
- **Preview**: Hover mostra descrição completa

#### Context Menu (Clique direito)
- **"Adicionar ao Facilita"**: Em qualquer link da web
- **"Adicionar seleção"**: Salvar texto selecionado como nota
- **"Buscar no Facilita"**: Buscar texto selecionado nos links

#### Atalhos de Teclado
- `Ctrl/Cmd + Shift + F`: Abrir popup
- `Ctrl/Cmd + Shift + K`: Command palette (busca universal)
- `Ctrl/Cmd + Shift + S`: Salvar página atual

#### Documentos/Agendas
- **Lista de documentos**: Ver documentos recentes
- **Download direto**: Baixar sem abrir portal
- **Preview**: Visualizar PDF inline (se possível)
- **Busca**: Buscar documentos por nome

### 2.3 Features Avançadas

#### Command Palette
- **Busca universal**: `Ctrl+K` abre barra de busca
- **Ações rápidas**:
  - "Adicionar link"
  - "Buscar documentos"
  - "Ir para categoria X"
  - "Abrir configurações"

#### New Tab Page (Opcional)
- **Substituir página nova aba**: Mostrar Facilita ao abrir nova aba
- **Grid de links**: Links mais usados em cards
- **Busca central**: Campo de busca destacado
- **Widgets**: Clima, hora, documentos recentes

#### Notificações
- **Notificações desktop**: Novos links/documentos compartilhados
- **Badges**: Contador de itens não visualizados no ícone
- **Push notifications**: Via Web Push API

#### Modo Offline
- **Cache inteligente**: Armazenar favoritos e links recentes
- **Indicador**: Mostrar quando está offline
- **Sincronização**: Auto-sync quando voltar online

#### Administração Light
- **Gerenciar categorias**: Criar/editar/deletar categorias
- **Bulk operations**: Selecionar múltiplos links para ações em lote
- **Estatísticas**: Links mais acessados, categorias mais usadas

---

## 3. Arquitetura Técnica

### 3.1 Componentes da Extensão

```
Extensão Facilita
├── Manifest V3 (configuração)
├── Service Worker (background)
│   ├── Gerenciamento de autenticação
│   ├── Comunicação com API
│   ├── Cache de dados
│   └── Listeners de eventos
├── Popup (interface principal)
│   ├── UI React/Preact
│   ├── Busca e navegação
│   └── Gerenciamento de links
├── Sidebar (painel lateral)
│   ├── View completa de links
│   └── Navegação por categorias
├── Content Scripts (injeção em páginas)
│   ├── Captura de contexto
│   └── Injeção de UI (se necessário)
├── Options Page (configurações)
│   └── Preferências do usuário
└── Offscreen Document (tarefas background)
    └── Operações assíncronas pesadas
```

### 3.2 Stack Tecnológico Sugerido

#### Frontend da Extensão
- **Framework**: React ou Preact (mais leve)
- **Build Tool**: Vite ou webpack
- **Styling**: Tailwind CSS (mesma stack do portal)
- **State**: Zustand ou Context API
- **TypeScript**: Para type safety

#### Comunicação
- **API Client**: Axios (reutilizar do frontend atual)
- **Protocol**: HTTP/HTTPS REST
- **WebSockets**: Para notificações real-time (opcional)

#### Storage
- **chrome.storage.sync**: Preferências do usuário (sincronizado)
- **chrome.storage.local**: Cache de dados
- **IndexedDB**: Armazenamento estruturado offline

#### Auth
- **JWT**: Mesmo sistema do backend atual
- **OAuth**: Passport + Google/Microsoft providers no backend
- **Token storage**: chrome.storage.local (criptografado)

### 3.3 Backend (Modificações Necessárias)

#### Novos Endpoints
```
POST /api/auth/oauth/google
POST /api/auth/oauth/microsoft
POST /api/auth/oauth/github

GET /api/extension/links/recent
GET /api/extension/favorites/sync
POST /api/extension/links/quick-add
```

#### Ajustes CORS
- Adicionar origem `chrome-extension://` nas permissões CORS
- Configurar headers para permitir requisições da extensão

#### Rate Limiting
- Implementar rate limiting específico para extensão
- Prevenir abuso de API

### 3.4 Fluxo de Dados

```
Usuário interage com Popup
         ↓
Service Worker processa ação
         ↓
Verifica cache local (IndexedDB)
         ↓
Se não cached → API Request (JWT auth)
         ↓
Backend Facilita (NestJS)
         ↓
PostgreSQL
         ↓
Response → Service Worker
         ↓
Atualiza cache local
         ↓
UI atualizada no Popup
```

### 3.5 Sincronização Multi-Device

#### Estratégia
1. **Pull on open**: Ao abrir extensão, buscar updates do servidor
2. **Push on change**: Mudanças locais enviadas imediatamente ao servidor
3. **Conflict resolution**: Last-write-wins (timestamp)
4. **Background sync**: Service Worker sincroniza periodicamente

#### Otimização
- **Delta sync**: Apenas mudanças desde última sincronização
- **Compression**: Compactar dados antes de enviar
- **Batching**: Agrupar múltiplas mudanças em uma requisição

---

## 4. Autenticação Detalhada

### 4.1 Fluxo de Login Tradicional

```
1. Usuário abre popup → tela de login
2. Insere email + senha
3. POST /api/auth/login
4. Backend retorna:
   - access_token (15min)
   - refresh_token (30 dias)
   - user info
5. Service Worker armazena tokens em chrome.storage.local
6. Popup redireciona para tela principal
```

### 4.2 Fluxo OAuth (Google/Microsoft)

```
1. Usuário clica "Entrar com Google"
2. chrome.identity.launchWebAuthFlow() abre popup de OAuth
3. Usuário autoriza no Google
4. Google redireciona com authorization code
5. Extensão envia code para backend
6. Backend:
   - Valida code com Google
   - Busca/cria usuário no banco
   - Gera JWT access/refresh tokens
   - Retorna tokens
7. Service Worker armazena tokens
8. Popup redireciona para tela principal
```

### 4.3 Manutenção de Sessão

#### Token Refresh Automático
- **Interceptor**: Detecta token expirado (401)
- **Auto-refresh**: Usa refresh_token para obter novo access_token
- **Retry**: Re-tenta requisição original com novo token
- **Expiration**: Se refresh_token expirado → forçar re-login

#### Persistência
- **Storage**: chrome.storage.local (persiste entre fechamentos)
- **Encryption**: Tokens criptografados com Web Crypto API
- **Logout**: Limpar storage completamente

---

## 5. Diferenças vs Portal Web

### Removido/Simplificado
- **Multi-empresa**: Extensão é pessoal (1 usuário = 1 contexto)
- **Hierarquia**: Sem gestão de unidades/setores/empresas
- **Admin panel**: Recursos administrativos complexos removidos
- **Gestão de usuários**: Cada um gerencia apenas sua conta
- **Permissões granulares**: Sistema simplificado
- **Backup/Restore**: Não necessário na extensão
- **Audit logs detalhados**: Logging simplificado

### Mantido
- **Links**: Core feature, totalmente funcional
- **Categorias**: Usuário cria suas próprias categorias
- **Favoritos**: Funcionalidade completa
- **Documentos**: Acesso e download
- **Notas**: Visualizar e criar notas pessoais
- **Upload de imagens**: Para links e notas

### Adicionado/Melhorado
- **Acesso rápido**: Popup sempre disponível
- **Captura de links**: De qualquer site
- **Atalhos de teclado**: Produtividade
- **Offline mode**: Trabalhar sem internet
- **Context menu**: Integração profunda com navegador
- **Command palette**: Busca universal

---

## 6. Experiência do Usuário

### 6.1 First-Time Setup

```
1. Instalar extensão da Chrome Web Store
2. Ícone aparece na toolbar
3. Clicar → Tela de boas-vindas
4. Opções:
   - "Já tenho conta" → Login
   - "Criar conta" → Registro
   - "Entrar com Google" → OAuth
5. Após login → Tutorial rápido (opcional)
6. Pronto para usar
```

### 6.2 Uso Diário

#### Cenário 1: Acessar link salvo
```
1. Ctrl+Shift+F (ou clicar ícone)
2. Digitar parte do nome do link
3. Enter para abrir
Tempo: ~3 segundos
```

#### Cenário 2: Salvar link da página atual
```
1. Navegando em site qualquer
2. Ctrl+Shift+S
3. Popup abre com título/URL pré-preenchidos
4. Escolher categoria
5. Salvar
Tempo: ~5 segundos
```

#### Cenário 3: Adicionar link de outro site
```
1. Clicar direito em link
2. "Adicionar ao Facilita"
3. Dialog rápido para categoria
4. Salvar
Tempo: ~3 segundos
```

### 6.3 Interface Visual

#### Popup Principal (300x600px)
```
┌─────────────────────────────┐
│  🔍 [Buscar links...]       │
├─────────────────────────────┤
│  ⭐ Favoritos               │
│  ┌───────────────────────┐  │
│  │ 📌 Portal RH          │  │
│  │ 🔗 Intranet           │  │
│  │ 📊 Dashboard Vendas   │  │
│  └───────────────────────┘  │
│                             │
│  📁 Categorias              │
│  › Trabalho (12)            │
│  › Pessoal (8)              │
│  › Dev Tools (15)           │
│                             │
│  📄 Documentos Recentes     │
│  › Manual_RH.pdf            │
│  › Politicas_2026.docx      │
├─────────────────────────────┤
│  ⚙️ Configs    👤 Perfil    │
└─────────────────────────────┘
```

#### Sidebar (400px largura)
```
┌────────────────────────────────┐
│  Facilita                      │
│  [Buscar...]              [×]  │
├────────────────────────────────┤
│                                │
│  📁 Trabalho                   │
│    📌 Portal RH                │
│    🔗 Sistema de Ponto         │
│    📊 BI Corporativo           │
│                                │
│  📁 Pessoal                    │
│    🎵 YouTube Music            │
│    📰 Feedly                   │
│                                │
│  📁 Dev Tools                  │
│    🔧 GitHub                   │
│    📚 Stack Overflow           │
│                                │
│  [+ Novo Link]                 │
└────────────────────────────────┘
```

---

## 7. Fases de Desenvolvimento

### Fase 1: MVP (4-6 semanas)
**Objetivo**: Extensão funcional básica

Features:
- ✅ Autenticação (email/senha)
- ✅ Popup com busca
- ✅ Lista de favoritos
- ✅ Adicionar link atual
- ✅ Sincronização básica
- ✅ Cache local

Entregável:
- Extensão instalável localmente
- Integrada com backend atual
- Testes manuais completos

### Fase 2: Produtividade (3-4 semanas)
**Objetivo**: Features de produtividade

Features:
- ✅ OAuth (Google/Microsoft)
- ✅ Context menu
- ✅ Atalhos de teclado
- ✅ Sidebar
- ✅ Command palette
- ✅ Categorias

Entregável:
- Versão beta pública
- Publicação em Chrome Web Store (unlisted)
- Feedback de beta testers

### Fase 3: Aprimoramento (2-3 semanas)
**Objetivo**: Polish e features avançadas

Features:
- ✅ Modo offline
- ✅ Notificações
- ✅ Estatísticas de uso
- ✅ New tab page (opcional)
- ✅ Temas (dark/light)
- ✅ Export/import de links

Entregável:
- Versão 1.0 estável
- Publicação pública
- Documentação completa

### Fase 4: Expansão (contínuo)
**Objetivo**: Multi-browser e features adicionais

Features:
- ✅ Firefox port
- ✅ Edge/Safari (se viável)
- ✅ Mobile companion app (?)
- ✅ Integrações (Notion, Slack, etc.)
- ✅ API pública para extensões de terceiros

---

## 8. Desafios Técnicos

### 8.1 Manifest V3
**Desafio**: Chrome descontinuou Manifest V2

**Solução**:
- Usar Service Workers (não background pages)
- Offscreen documents para tarefas pesadas
- Declarar permissões explicitamente
- Ajustar CSP (Content Security Policy)

### 8.2 Cross-Browser Compatibility
**Desafio**: APIs diferentes em cada navegador

**Solução**:
- Usar WebExtension Polyfill
- Testar em Chrome, Edge, Firefox
- Documentar diferenças
- Releases separados por browser (se necessário)

### 8.3 Segurança
**Desafio**: Armazenar tokens de forma segura

**Solução**:
- Criptografar tokens antes de armazenar
- Web Crypto API para encryption
- Nunca expor tokens em content scripts
- HTTPS obrigatório

### 8.4 Performance
**Desafio**: Extensão não pode travar navegador

**Solução**:
- Lazy loading de componentes
- Virtualização de listas longas
- Debounce em buscas
- Cache agressivo
- Limitar tamanho do cache (ex: máximo 500 links cached)

### 8.5 Sincronização
**Desafio**: Conflitos entre múltiplos dispositivos

**Solução**:
- Timestamps em todas as operações
- Last-write-wins strategy
- Eventual consistency (não tentar ser real-time perfeito)
- Indicador visual de "sincronizando..."

### 8.6 Offline
**Desafio**: Funcionar sem internet

**Solução**:
- Service Worker intercepta requests
- Cache API ou IndexedDB para storage
- Indicador claro de modo offline
- Queue de operações para sincronizar depois

---

## 9. Modelo de Distribuição

### 9.1 Publicação

#### Chrome Web Store
- **Listing**: Público, gratuito
- **Categorias**: Productivity, Tools
- **Screenshots**: 5-7 imagens demonstrando features
- **Vídeo**: Demo de 30-60 segundos
- **Descrição**: PT-BR e EN

#### Firefox Add-ons
- **Port**: Ajustar para Firefox APIs
- **Review**: Processo de review mais rigoroso
- **Assinatura**: Obrigatória

#### Edge Add-ons
- **Port**: Geralmente compatível com Chrome
- **Publicação**: Microsoft Partner Center

### 9.2 Versionamento
- **Semantic Versioning**: 1.0.0, 1.1.0, 2.0.0
- **Auto-update**: Usuários recebem updates automaticamente
- **Release notes**: Changelog em cada versão

### 9.3 Suporte
- **GitHub Issues**: Para bugs e feature requests
- **Email**: Suporte via email
- **FAQ**: Página de perguntas frequentes
- **Tutoriais**: Vídeos e guias

---

## 10. Integração com Ecossistema Facilita

### 10.1 Backend Compartilhado
- Mesma API REST do portal web
- Mesmos endpoints de autenticação
- Mesma base de dados PostgreSQL
- Versionamento de API (v1, v2)

### 10.2 Consistência de Dados
- Mudanças na extensão refletem no portal web
- Mudanças no portal refletem na extensão
- Sincronização bidirecional

### 10.3 Feature Parity (Parcial)
- **Core features**: 100% compartilhadas
- **Admin features**: Apenas no portal web
- **Extension-only**: Atalhos, context menu, etc.

### 10.4 Migração de Usuários
- Contas existentes funcionam na extensão
- Sem necessidade de re-registro
- Onboarding específico para extensão

---

## 11. Métricas de Sucesso

### 11.1 Adoção
- Número de instalações ativas
- Taxa de retenção (D1, D7, D30)
- Avaliações na Web Store (meta: >4.0 estrelas)

### 11.2 Engajamento
- Média de buscas por dia
- Links adicionados por usuário
- Favoritos por usuário
- Tempo médio de uso diário

### 11.3 Performance
- Tempo de carregamento do popup (<200ms)
- Tempo de busca (<100ms)
- Taxa de erro de API (<1%)
- Uso de memória (<50MB)

### 11.4 Satisfação
- NPS (Net Promoter Score)
- Reviews positivas vs negativas
- Feature requests mais votados

---

## 12. Próximos Passos

### Decisões Necessárias
1. **Priorizar OAuth?** Google first ou adicionar depois?
2. **Sidebar ou apenas popup?** Qual implementar primeiro?
3. **Offline mode no MVP?** Ou deixar para fase 2?
4. **New tab page?** Feature desejada ou não?
5. **Multi-browser desde o início?** Ou Chrome first?

### Pré-requisitos
1. **Backend**: Adicionar endpoints OAuth
2. **CORS**: Configurar para `chrome-extension://`
3. **Rate limiting**: Implementar
4. **Docs**: API documentation atualizada

### Timeline Estimado
- **Fase 1 (MVP)**: 4-6 semanas
- **Fase 2 (Produtividade)**: 3-4 semanas
- **Fase 3 (Polish)**: 2-3 semanas
- **Total**: 9-13 semanas (~3 meses)

### Recursos Necessários
- 1 desenvolvedor full-time
- 1 designer (part-time) para UI/UX
- Backend já existente (mínimas modificações)
- Infraestrutura já existente (API + DB)

---

## Conclusão

A extensão Facilita é **tecnicamente viável** e pode trazer **grande valor** para usuários que precisam de acesso rápido a links e recursos.

**Principais vantagens**:
- Aproveita backend existente (90% reuso)
- Baixo custo de manutenção
- Alta produtividade para usuários
- Diferencial competitivo

**Principais desafios**:
- Aprender APIs de extensões (Manifest V3)
- Garantir segurança de tokens
- Suporte multi-browser

**Recomendação**: Começar com MVP em Chrome, validar com beta testers, e expandir baseado em feedback.
