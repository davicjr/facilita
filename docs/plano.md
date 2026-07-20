# Plano de Reescrita Completa - FACILITA V2.0

## Visão Executiva

Este plano detalha a **reescrita completa** do projeto FACILITA em **NestJS + Next.js**, incorporando:
1. **Portal de Links/Agendas/Arquivos** (FACILITA atual modernizado)
2. **Arquitetura multi-empresa nativa** (Company → Unit → Sector → User)
3. **Sistema de Backup/Reset automatizado** (inspirado no CHECK-IN)
4. **Permissões granulares por role** (SUPERADMIN, ADMIN, USER)
5. **8 funcionalidades extras priorizadas**:
   - Sistema de Favoritos (login obrigatório)
   - Busca Avançada Full-Text
   - Histórico de Versões
   - Upload Avançado
   - Auditoria Completa
   - ActivityLog/Feed de Atividades (apenas Admin/SuperAdmin)
   - Configurações do Sistema
   - PWA (Progressive Web App)

**Stack Tecnológica:**
- Backend: NestJS 11 + Prisma 5 + PostgreSQL 16 + Redis 7
- Frontend: Next.js 15 (App Router) + TypeScript + Zustand + Shadcn/ui
- Infraestrutura: Nginx

**Estimativa:** 4 meses (16 semanas) | 1 desenvolvedor full-stack
**Custo Infraestrutura:** ~R$50/mês (início) | ~R$200/mês (escalado)

---

## 1. ANÁLISE COMPARATIVA DOS PROJETOS

### 1.1 Projeto FACILITA (Atual)

**Stack Tecnológico:**
- **Backend**: Flask (Python 3.10+)
- **Banco de Dados**: SQLite (dev) / PostgreSQL
- **ORM**: Flask-SQLAlchemy
- **Autenticação**: Session-based (Flask Sessions)
- **Frontend**: React 18 + TypeScript + Vite

**Estrutura Atual:**
```
backend/
├── app/
│   ├── __init__.py       # Factory pattern
│   ├── extensions.py     # db, cors
│   ├── models.py         # User, Link, Schedule, Category, Color
│   └── routes/
│       └── __init__.py   # Blueprint API
├── instance/
│   └── facilita.sqlite
└── wsgi.py
```

**Entidades Atuais:**
- User (id, username, password_hash, is_admin, theme)
- Link (id, title, url, user_id, category_id, color, image_url, file_url)
- Schedule (id, title, file_url, user_id, category_id)
- Category (id, name, color, icon, admin_only)
- Color (id, value, name)

**Sistema de Permissões:**
- Binário: `is_admin` (True/False)
- Decorators: `@login_required`, `@admin_required`

**Limitações Identificadas:**
- ❌ Sem sistema de setores/departamentos
- ❌ Sem backup/restore automatizado
- ❌ Sem reset controlado do sistema
- ❌ Sem permissões granulares
- ❌ Sem auditoria de ações
- ❌ Sem tipos de usuários intermediários (Manager)
- ❌ Sessões em memória (não persistem)
- ❌ Migrations manuais via ALTER TABLE

### 1.2 Projeto CHECK-IN (Referência)

**Stack Tecnológico:**
- **Backend**: NestJS 11 (TypeScript)
- **Banco de Dados**: PostgreSQL 18
- **ORM**: Prisma 5.14
- **Autenticação**: JWT (httpOnly cookies + Bearer)
- **Frontend**: Next.js (App Router)

**Funcionalidades Avançadas:**
- ✅ Sistema de setores com geolocalização
- ✅ Backup modular seletivo automatizado
- ✅ Reset controlado por flags
- ✅ Configurações persistentes (SystemConfig)
- ✅ Permissões granulares por role
- ✅ 3 tipos de usuários (USER, MANAGER, ADMIN)
- ✅ Auditoria completa (AuditLog)
- ✅ Guards e decorators para autorização
- ✅ Soft delete (deletedAt)
- ✅ Migrations gerenciadas (Prisma/Alembic)

**Padrões Arquiteturais:**
- Modular (NestJS modules)
- DTOs para validação
- Services para lógica de negócio
- Controllers para rotas
- Guards para autenticação/autorização
- Decorators customizados

---

## 2. OBJETIVOS DA MIGRAÇÃO

### 2.1 Migração de Banco de Dados

**Objetivos:**
1. ✅ Migrar de SQLite para PostgreSQL em todos os ambientes
2. ✅ Implementar sistema de migrations gerenciado (Flask-Migrate/Alembic)
3. ✅ Adaptar tipos de dados para PostgreSQL
4. ✅ Remover ALTER TABLE manuais
5. ✅ Adicionar constraints de integridade referencial
6. ✅ Implementar índices para performance

### 2.2 Reestruturação de Entidades

**Novos Modelos:**
1. **Sector** (Setores/Departamentos)
2. **RolePermission** (Permissões por tipo de usuário)
3. **AuditLog** (Logs de auditoria)
4. **SystemConfig** (Configurações do sistema)

**Modificações em User:**
- Adicionar `role` (USER, MANAGER, ADMIN)
- Adicionar `sector_id` (FK para Sector)
- Adicionar `status` (ACTIVE, INACTIVE)
- Adicionar `cpf`, `matricula` (identificadores alternativos)
- Adicionar `deleted_at` (soft delete)
- Remover `is_admin` (substituído por role)

**Modificações em Link/Schedule:**
- Adicionar `sector_id` (FK para Sector)
- Adicionar `deleted_at` (soft delete)

### 2.3 Sistema de Permissões

**Implementar:**
1. Enum `UserRole` (USER, MANAGER, ADMIN)
2. Tabela `RolePermission` com permissões granulares:
   - can_view_dashboard
   - can_manage_users
   - can_manage_sectors
   - can_manage_links
   - can_manage_categories
   - can_backup_system
   - can_reset_system
   - can_view_audit_logs
   - restrict_to_own_sector

3. Decorators:
   - `@permission_required('can_backup_system')`
   - `@role_required(UserRole.ADMIN, UserRole.MANAGER)`

4. Service de autorização:
   - `AuthorizationService.require_permission(user, permission)`
   - `AuthorizationService.require_sector_access(user, sector_id)`

### 2.4 Funcionalidades Novas

**1. Sistema de Setores:**
- CRUD de setores (apenas ADMIN)
- Vinculação de usuários a setores
- Vinculação de links/schedules a setores
- Restrição de acesso por setor (MANAGER)

**2. Sistema de Backup:**
- Backup completo do banco (JSON)
- Backup seletivo (flags: users, sectors, links, schedules, categories)
- Importação com modo replace/merge
- Automação via agendamento (cron-like)
- Diretórios configuráveis

**3. Sistema de Reset:**
- Reset total ou seletivo
- Flags: reset_users, reset_sectors, reset_links, etc.
- Seed automático de admin padrão
- Seed de permissões padrão
- Auditoria de reset

**4. Diretórios Padrão:**
- Configurações persistentes no banco (SystemConfig)
- Chaves: `backup_directory`, `upload_directory`, `export_directory`
- Validação e criação automática de diretórios

**5. Auditoria:**
- Log de todas as ações CRUD
- Armazenamento de: action, target_type, target_id, details, ip, user_id
- Visualização de logs (apenas ADMIN/MANAGER)

---

## 3. FUNCIONALIDADES EXTRAS PRIORIZADAS (8 Selecionadas)

### 3.1 Sistema de Favoritos ⭐⭐⭐
**Valor**: Acesso rápido a links/agendas mais usados
**Restrição**: Apenas usuários autenticados
**Funcionalidades**:
- Favoritar/desfavoritar links e agendas
- Página dedicada "Meus Favoritos" com filtros
- Contador de favoritos por item
- Ordenação por mais favoritados
- Badge visual em items favoritados

### 3.2 Busca Avançada Full-Text ⭐⭐⭐
**Valor**: Localização rápida de conteúdo
**Funcionalidades**:
- Buscar em títulos, descrições, URLs, conteúdo de notas
- PostgreSQL tsvector para busca performática
- Filtros combinados (categoria + setor + data + tipo)
- Resultados paginados e ordenáveis
- Destacar termos encontrados (highlight)
- Busca global (admin) e por setor (usuários)
- SearchBar global no header

### 3.3 Histórico de Versões ⭐⭐⭐
**Valor**: Rastreabilidade e rollback de alterações
**Funcionalidades**:
- Versionar alterações em links (título, URL, descrição)
- Ver histórico completo de versões
- Comparação visual (diff) entre versões
- Restaurar versão anterior com confirmação
- Registro de quem alterou + quando + motivo
- Modal dedicado para visualização de histórico

### 3.4 Upload Avançado de Arquivos ⭐⭐⭐
**Valor**: UX superior para agendas e imagens de links
**Funcionalidades**:
- Drag & drop de múltiplos arquivos
- Preview antes de enviar (imagens, PDFs)
- Compressão automática de imagens (Sharp no backend)
- Validação de tipo e tamanho (client + server)
- Barra de progresso de upload
- Suporte a múltiplos formatos (PDF, images, Excel, Word)
- Cropping e ajuste de imagens

### 3.5 Auditoria Completa ⭐⭐⭐
**Valor**: Rastreabilidade e segurança
**Restrição**: Visualização apenas Admin/SuperAdmin
**Funcionalidades**:
- Log automático de todas ações CRUD via Interceptor
- Registro de: ação, tipo de entidade, ID, detalhes, IP, usuário
- Página de auditoria com filtros avançados
- Filtrar por: usuário, ação, data, tipo de entidade
- Export de logs para CSV
- Timeline view com avatares

### 3.6 ActivityLog/Feed de Atividades ⭐⭐
**Valor**: Visibilidade de atividades recentes
**Restrição**: Apenas Admin e SuperAdmin
**Funcionalidades**:
- Feed de últimas 50 ações no dashboard
- "Fulano criou um novo link há 5 min"
- Ícones e avatares dos usuários
- Filtrar por tipo de atividade
- Paginação infinita (scroll)
- Widget no dashboard administrativo

### 3.7 Configurações do Sistema ⭐⭐⭐
**Valor**: Flexibilidade e manutenibilidade
**Restrição**: Apenas SuperAdmin
**Funcionalidades**:
- Tabela SystemConfig persistente no banco
- Configs editáveis: backup_directory, upload_directory, retention_days
- Configs não editáveis: version, install_date
- Validação de paths e valores
- Seeding automático de configs padrão
- Interface administrativa para edição

### 3.8 PWA (Progressive Web App) ⭐⭐⭐
**Valor**: Experiência mobile superior
**Funcionalidades**:
- Instalável em dispositivos móveis
- Service Worker para cache offline
- Manifest.json configurado
- Ícones PWA (192x192, 512x512)
- Funcionalidade offline básica (visualização de favoritos)
- Splash screen customizada
- Add to Home Screen prompt

---

## 4. ROADMAP DE IMPLEMENTAÇÃO (4 MILESTONES)

### MILESTONE 1: Setup Inicial e Fundação (2-3 semanas)
**Objetivo**: Infraestrutura base funcionando

**Backend:**
- Setup NestJS + Prisma + PostgreSQL + Redis
- Schema Prisma inicial (User, Company, Unit, Sector, RolePermission)
- Auth completo: JWT + Refresh + Guards + Decorators
- Seed inicial: superadmin, roles permissions
- Health checks

**Frontend:**
- Setup Next.js 15 + TypeScript + Tailwind + Shadcn/ui
- Axios client + interceptors (token refresh)
- Zustand stores: authStore, uiStore
- Layout base: Header, Sidebar, Footer
- Páginas de auth: login, register, forgot-password

**DevOps:**
- .env.example completo
- Scripts de setup

**Entregável**: Sistema rodando com login funcional

---

### MILESTONE 2: Multi-Empresa e Portal FACILITA (3-4 semanas)
**Objetivo**: Arquitetura multi-empresa + Portal de links/agendas operacional

**Backend:**
- Módulos: CompaniesModule, UnitsModule, SectorsModule, UsersModule
- Módulos: LinksModule, CategoriesModule, UploadedSchedulesModule, UploadsModule
- CRUD completo para empresas, unidades, setores, usuários
- CRUD de links, categorias, agendas
- Upload de arquivos com validação e compressão (Sharp)
- Guards hierárquicos
- Validações: CNPJ, CPF
- Endpoints públicos para links/agendas

**Frontend:**
- Página pública: / (landing) com grid de links
- Filtros: categoria, setor, busca básica
- Upload drag-and-drop
- Admin: /admin/empresas, /admin/unidades, /admin/setores, /admin/usuarios
- Admin: /admin/links, /admin/categorias, /admin/agendas
- Forms com validação (react-hook-form + zod)
- Tabelas com paginação, ordenação, busca

**Testes:**
- Testes unitários de serviços
- Testes de guards e validações
- Testes de upload

**Entregável**: Portal de links/agendas funcional + gestão multi-empresa

---

### MILESTONE 3: Funcionalidades Extras Priorizadas (3-4 semanas)
**Objetivo**: Recursos diferenciados de alto valor

**Backend:**
- FavoritesModule: favoritar links/agendas (login obrigatório)
- SearchModule: busca full-text (PostgreSQL tsvector + índices)
- LinkVersionsModule: histórico de versões + diff
- UploadsModule Enhancement: drag-drop, preview, compressão Sharp, progresso
- AuditLogsModule: auditoria automática via Interceptor
- ActivityFeedModule: feed de atividades (apenas Admin/SuperAdmin)
- SystemConfigModule: configurações persistentes

**Frontend:**
- Favoritos: ícone estrela + página /my/favorites
- Busca: SearchBar global + página /search com filtros avançados
- Histórico: modal de versões com diff visual
- Upload avançado: drag-and-drop, preview, progress bar
- Auditoria: página /admin/audit-logs com filtros
- Activity Feed: widget no dashboard admin
- Configurações: /admin/settings
- PWA: Service Worker, manifest.json, ícones

**Testes:**
- Testes de funcionalidades extras
- Testes de auditoria e logs

**Entregável**: Plataforma completa com 8 funcionalidades extras

---

### MILESTONE 4: Produção e Polimento (2-3 semanas)
**Objetivo**: Sistema production-ready com observabilidade e UX refinada

**Backend:**
- ✅ BackupModule: backup/restore completo (IMPLEMENTADO)
- ✅ BackupSchedulerService: agendamento automático diário (IMPLEMENTADO)
- ✅ ResetModule: reset seletivo do sistema (IMPLEMENTADO)
- Winston logging estruturado
- Health checks detalhados (DB, Redis, Disk)
- Rate limiting e throttling
- Documentação Swagger completa
- Otimizações de queries e índices

**Frontend:**
- ✅ Backup: /admin/backup com export/import (IMPLEMENTADO)
- ✅ Reset: /admin/reset (IMPLEMENTADO)
- Temas: light/dark mode persistente
- Responsividade total (mobile-first)
- Animações Framer Motion nos modais
- Loading states consistentes
- Error boundaries e tratamento de erros
- Toast notifications (Sonner)

**DevOps:**
- Nginx otimizado (gzip, cache, SSL)
- CI/CD pipeline (GitHub Actions)
- Backup automático diário (cron)
- Monitoramento básico (logs, health)
- Scripts de deploy automatizado

**Testes:**
- Testes unitários críticos (services)
- Testes E2E principais fluxos (Playwright)
- Testes de carga básicos (k6)
- Validação de segurança (OWASP)

**Documentação:**
- README completo
- Guia de instalação
- Guia de backup/restore
- Diagramas de arquitetura

**Entregável**: Sistema em produção com observabilidade completa

---

## 5. ETAPAS DE IMPLEMENTAÇÃO DETALHADAS

### FASE 1: Preparação e Backup (Semana 1)

#### 1.1 Backup dos Dados Atuais

**Passos:**
1. Exportar dados do SQLite atual:
   ```bash
   python backend/scripts/export_sqlite_data.py
   ```

2. Salvar dump em `backups/pre-migration-{timestamp}.json`

3. Validar integridade dos dados exportados

**Arquivos a criar:**
- `backend/scripts/export_sqlite_data.py`

#### 1.2 Criar Branch de Desenvolvimento

```bash
git checkout -b feature/postgresql-migration
```

### FASE 2: Configuração do Backend (3-5 dias)

#### 2.1 Instalar Dependências

**Adicionar ao `requirements.txt`:**
```
Flask-Migrate==4.0.5
alembic==1.13.1
psycopg2-binary==2.9.9  # (já existe)
argon2-cffi==23.1.0     # Para hash de senhas (opcional, migrar de Werkzeug)
```

#### 2.2 Configurar Flask-Migrate

**Modificar `backend/app/__init__.py`:**

```python
from flask_migrate import Migrate
from app.extensions import db

def create_app():
    app = Flask(__name__)

    # Configuração do banco
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/facilita"
    )

    db.init_app(app)
    migrate = Migrate(app, db)  # NOVO

    # Remover blocos de ALTER TABLE manuais (linhas 55-84)

    return app
```

**Inicializar migrations:**
```bash
cd backend
flask db init
```

#### 2.3 Reestruturar Models

**Criar novos enums (`backend/app/enums.py`):**

```python
import enum

class UserRole(str, enum.Enum):
    USER = "USER"
    MANAGER = "MANAGER"
    ADMIN = "ADMIN"

class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
```

**Modificar `backend/app/models.py`:**

```python
from app.enums import UserRole, UserStatus
from sqlalchemy.dialects.postgresql import JSON, UUID
import uuid

class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = db.Column(db.String(80), unique=True, nullable=False)
    cpf = db.Column(db.String(11), unique=True, nullable=True)  # NOVO
    matricula = db.Column(db.String(50), unique=True, nullable=True)  # NOVO
    password_hash = db.Column(db.String(512), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.USER)  # NOVO
    status = db.Column(db.Enum(UserStatus), nullable=False, default=UserStatus.ACTIVE)  # NOVO
    sector_id = db.Column(UUID(as_uuid=True), db.ForeignKey('sector.id'), nullable=True)  # NOVO
    theme = db.Column(JSON, nullable=True)  # Alterado de Text para JSON
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)  # NOVO
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)  # NOVO
    deleted_at = db.Column(db.DateTime, nullable=True)  # NOVO (soft delete)

    # Relacionamentos
    sector = db.relationship('Sector', back_populates='users')
    links = db.relationship('Link', back_populates='user', cascade='all, delete-orphan')
    schedules = db.relationship('Schedule', back_populates='user', cascade='all, delete-orphan')
    audit_logs = db.relationship('AuditLog', back_populates='user')

class Sector(db.Model):  # NOVO
    __tablename__ = 'sector'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(120), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.Enum(UserStatus), nullable=False, default=UserStatus.ACTIVE)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = db.Column(db.DateTime, nullable=True)

    # Relacionamentos
    users = db.relationship('User', back_populates='sector')
    links = db.relationship('Link', back_populates='sector')
    schedules = db.relationship('Schedule', back_populates='sector')

class Link(db.Model):
    __tablename__ = 'link'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # Alterado
    title = db.Column(db.String(120), nullable=False)
    url = db.Column(db.String(255), nullable=False)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('user.id'), nullable=True)
    sector_id = db.Column(UUID(as_uuid=True), db.ForeignKey('sector.id'), nullable=True)  # NOVO
    category_id = db.Column(UUID(as_uuid=True), db.ForeignKey('category.id'), nullable=True)  # Alterado
    color = db.Column(db.String(30), nullable=True)
    image_url = db.Column(db.String(255), nullable=True)
    file_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)  # NOVO
    deleted_at = db.Column(db.DateTime, nullable=True)  # NOVO

    # Relacionamentos
    user = db.relationship('User', back_populates='links')
    sector = db.relationship('Sector', back_populates='links')  # NOVO
    category = db.relationship('Category', back_populates='links')

class Schedule(db.Model):
    __tablename__ = 'schedule'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # Alterado
    title = db.Column(db.String(120), nullable=False)
    file_url = db.Column(db.String(255), nullable=False)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('user.id'), nullable=True)
    sector_id = db.Column(UUID(as_uuid=True), db.ForeignKey('sector.id'), nullable=True)  # NOVO
    category_id = db.Column(UUID(as_uuid=True), db.ForeignKey('category.id'), nullable=True)  # Alterado
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)  # NOVO
    deleted_at = db.Column(db.DateTime, nullable=True)  # NOVO

    # Relacionamentos
    user = db.relationship('User', back_populates='schedules')
    sector = db.relationship('Sector', back_populates='schedules')  # NOVO
    category = db.relationship('Category', back_populates='schedules')

class Category(db.Model):
    __tablename__ = 'category'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # Alterado
    name = db.Column(db.String(80), unique=True, nullable=False)
    color = db.Column(db.String(30), nullable=True)
    icon = db.Column(db.String(50), nullable=True)
    admin_only = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)  # NOVO

    # Relacionamentos
    links = db.relationship('Link', back_populates='category')
    schedules = db.relationship('Schedule', back_populates='category')

class RolePermission(db.Model):  # NOVO
    __tablename__ = 'role_permission'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role = db.Column(db.Enum(UserRole), unique=True, nullable=False)

    # Permissões gerais
    can_view_dashboard = db.Column(db.Boolean, default=False, nullable=False)
    can_access_admin = db.Column(db.Boolean, default=False, nullable=False)

    # Gestão de usuários
    can_view_users = db.Column(db.Boolean, default=False, nullable=False)
    can_create_users = db.Column(db.Boolean, default=False, nullable=False)
    can_edit_users = db.Column(db.Boolean, default=False, nullable=False)
    can_delete_users = db.Column(db.Boolean, default=False, nullable=False)

    # Gestão de setores
    can_view_sectors = db.Column(db.Boolean, default=False, nullable=False)
    can_manage_sectors = db.Column(db.Boolean, default=False, nullable=False)

    # Gestão de links
    can_view_links = db.Column(db.Boolean, default=True, nullable=False)
    can_manage_links = db.Column(db.Boolean, default=False, nullable=False)

    # Gestão de categorias
    can_manage_categories = db.Column(db.Boolean, default=False, nullable=False)

    # Gestão de arquivos/schedules
    can_manage_schedules = db.Column(db.Boolean, default=False, nullable=False)

    # Sistema
    can_backup_system = db.Column(db.Boolean, default=False, nullable=False)
    can_reset_system = db.Column(db.Boolean, default=False, nullable=False)
    can_view_audit_logs = db.Column(db.Boolean, default=False, nullable=False)
    can_manage_system_config = db.Column(db.Boolean, default=False, nullable=False)

    # Restrições
    restrict_to_own_sector = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

class AuditLog(db.Model):  # NOVO
    __tablename__ = 'audit_log'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('user.id'), nullable=True)
    action = db.Column(db.String(50), nullable=False)  # Ex: 'USER_CREATED', 'LINK_UPDATED'
    target_type = db.Column(db.String(50), nullable=True)  # Ex: 'User', 'Link'
    target_id = db.Column(UUID(as_uuid=True), nullable=True)
    details = db.Column(JSON, nullable=True)  # JSON com detalhes da ação
    ip = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relacionamento
    user = db.relationship('User', back_populates='audit_logs')

class SystemConfig(db.Model):  # NOVO
    __tablename__ = 'system_config'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=True)
    type = db.Column(db.String(20), nullable=False, default='string')  # string, number, boolean, path
    is_editable = db.Column(db.Boolean, default=True, nullable=False)
    category = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Criar migration inicial:**
```bash
flask db migrate -m "Migrar para PostgreSQL e adicionar novos modelos"
```

#### 2.4 Implementar Serviços de Negócio

**Criar `backend/app/services/authorization_service.py`:**

```python
from flask import abort
from app.models import RolePermission, User
from app.enums import UserRole
from app.extensions import db

class AuthorizationService:
    @staticmethod
    def require_permission(user: User, permission: str):
        """Valida se o usuário tem a permissão especificada"""
        if not user:
            abort(403, description="Usuário não autenticado")

        role_permission = RolePermission.query.filter_by(role=user.role).first()

        if not role_permission:
            abort(403, description="Permissões não configuradas")

        has_permission = getattr(role_permission, permission, False)

        if not has_permission:
            abort(403, description="Você não tem permissão para executar esta ação")

    @staticmethod
    def require_sector_access(user: User, sector_id: str):
        """Valida se o usuário pode acessar o setor especificado"""
        if not user:
            abort(403, description="Usuário não autenticado")

        # Admin tem acesso irrestrito
        if user.role == UserRole.ADMIN:
            return

        role_permission = RolePermission.query.filter_by(role=user.role).first()

        if role_permission and role_permission.restrict_to_own_sector:
            if user.sector_id != sector_id:
                abort(403, description="Você não tem permissão para acessar este setor")

    @staticmethod
    def can_manage_user(actor: User, target_user: User):
        """Valida se o actor pode gerenciar o target_user"""
        # Admin pode gerenciar qualquer usuário
        if actor.role == UserRole.ADMIN:
            return True

        # Manager só pode gerenciar USER do próprio setor
        if actor.role == UserRole.MANAGER:
            if target_user.role == UserRole.USER and target_user.sector_id == actor.sector_id:
                return True

        return False
```

**Criar `backend/app/services/audit_service.py`:**

```python
from app.models import AuditLog
from app.extensions import db
from datetime import datetime

class AuditService:
    @staticmethod
    def log(user_id, action, target_type=None, target_id=None, details=None, ip=None):
        """Registra uma ação no log de auditoria"""
        audit = AuditLog(
            user_id=user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details,
            ip=ip,
            created_at=datetime.utcnow()
        )
        db.session.add(audit)
        db.session.commit()
        return audit
```

**Criar `backend/app/services/sector_service.py`:**

```python
from app.models import Sector, User
from app.extensions import db
from app.enums import UserStatus
from app.services.audit_service import AuditService
from datetime import datetime

class SectorService:
    @staticmethod
    def create(name, description=None, user_id=None, ip=None):
        sector = Sector(
            name=name,
            description=description,
            status=UserStatus.ACTIVE
        )
        db.session.add(sector)
        db.session.commit()

        AuditService.log(user_id, 'SECTOR_CREATED', 'Sector', str(sector.id),
                        {'name': name}, ip)

        return sector

    @staticmethod
    def find_all(include_inactive=False):
        query = Sector.query.filter_by(deleted_at=None)

        if not include_inactive:
            query = query.filter_by(status=UserStatus.ACTIVE)

        return query.order_by(Sector.name).all()

    @staticmethod
    def soft_delete(sector_id, user_id=None, ip=None):
        sector = Sector.query.filter_by(id=sector_id, deleted_at=None).first()

        if not sector:
            return None

        # Validar se há usuários vinculados
        user_count = User.query.filter_by(sector_id=sector_id, deleted_at=None).count()
        if user_count > 0:
            raise ValueError(f"Não é possível deletar o setor. Há {user_count} usuário(s) vinculado(s).")

        sector.deleted_at = datetime.utcnow()
        sector.status = UserStatus.INACTIVE
        db.session.commit()

        AuditService.log(user_id, 'SECTOR_DELETED', 'Sector', str(sector_id), ip=ip)

        return sector
```

#### 2.5 Criar Decorators de Autorização

**Criar `backend/app/decorators.py`:**

```python
from functools import wraps
from flask import session, abort, request
from app.models import User
from app.enums import UserRole
from app.services.authorization_service import AuthorizationService

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            abort(401, description="Autenticação necessária")

        user = User.query.filter_by(id=user_id, deleted_at=None).first()
        if not user:
            session.pop("user_id", None)
            abort(401, description="Usuário não encontrado")

        # Injeta o usuário no request
        request.current_user = user

        return f(*args, **kwargs)

    return decorated_function

def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = getattr(request, 'current_user', None)

            if not user:
                abort(403, description="Usuário não autenticado")

            if user.role not in roles:
                abort(403, description="Você não tem permissão para acessar este recurso")

            return f(*args, **kwargs)

        return decorated_function

    return decorator

def permission_required(permission):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = getattr(request, 'current_user', None)

            AuthorizationService.require_permission(user, permission)

            return f(*args, **kwargs)

        return decorated_function

    return decorator
```

#### 2.6 Adaptar Rotas Existentes

**Modificar `backend/app/routes/__init__.py`:**

- Substituir `@admin_required` por `@role_required(UserRole.ADMIN)`
- Adicionar `@permission_required('can_manage_links')` onde apropriado
- Injetar auditoria em ações CRUD
- Adicionar filtros por setor para MANAGER

**Exemplo:**

```python
from app.decorators import login_required, role_required, permission_required
from app.enums import UserRole
from app.services.audit_service import AuditService

@api.route("/links", methods=["POST"])
@login_required
@permission_required('can_manage_links')
def create_link():
    user = request.current_user
    data = request.get_json()

    # Validação de setor para MANAGER
    if user.role == UserRole.MANAGER:
        data['sector_id'] = user.sector_id

    link = Link(**data)
    db.session.add(link)
    db.session.commit()

    AuditService.log(
        user_id=user.id,
        action='LINK_CREATED',
        target_type='Link',
        target_id=str(link.id),
        details={'title': link.title, 'url': link.url},
        ip=request.remote_addr
    )

    return jsonify(link.to_dict()), 201
```

#### 2.7 Implementar Novas Rotas

**Criar `backend/app/routes/sectors.py`:**

```python
from flask import Blueprint, jsonify, request
from app.models import Sector
from app.services.sector_service import SectorService
from app.decorators import login_required, role_required
from app.enums import UserRole

sectors_bp = Blueprint('sectors', __name__)

@sectors_bp.route("", methods=["GET"])
@login_required
@role_required(UserRole.ADMIN, UserRole.MANAGER)
def list_sectors():
    include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
    sectors = SectorService.find_all(include_inactive)
    return jsonify([s.to_dict() for s in sectors])

@sectors_bp.route("", methods=["POST"])
@login_required
@role_required(UserRole.ADMIN)
def create_sector():
    data = request.get_json()
    user = request.current_user

    sector = SectorService.create(
        name=data['name'],
        description=data.get('description'),
        user_id=user.id,
        ip=request.remote_addr
    )

    return jsonify(sector.to_dict()), 201

# ... demais rotas (update, delete, restore)
```

**Criar `backend/app/routes/backup.py`:**

```python
from flask import Blueprint, jsonify, request, send_file
from app.services.backup_service import BackupService
from app.decorators import login_required, permission_required

backup_bp = Blueprint('backup', __name__)

@backup_bp.route("/export", methods=["POST"])
@login_required
@permission_required('can_backup_system')
def export_backup():
    data = request.get_json()
    user = request.current_user

    backup_file = BackupService.export(
        include_all=data.get('include_all', True),
        include_users=data.get('include_users', False),
        include_sectors=data.get('include_sectors', False),
        user_id=user.id,
        ip=request.remote_addr
    )

    return send_file(backup_file, as_attachment=True)

@backup_bp.route("/import", methods=["POST"])
@login_required
@permission_required('can_backup_system')
def import_backup():
    file = request.files.get('file')
    mode = request.form.get('mode', 'merge')  # merge ou replace
    user = request.current_user

    result = BackupService.import_data(file, mode, user.id, request.remote_addr)

    return jsonify(result)
```

**Criar `backend/app/routes/reset.py`:**

```python
from flask import Blueprint, jsonify, request
from app.services.reset_service import ResetService
from app.decorators import login_required, permission_required

reset_bp = Blueprint('reset', __name__)

@reset_bp.route("", methods=["POST"])
@login_required
@permission_required('can_reset_system')
def reset_system():
    data = request.get_json()
    user = request.current_user

    result = ResetService.reset(
        reset_all=data.get('reset_all', False),
        reset_users=data.get('reset_users', False),
        reset_sectors=data.get('reset_sectors', False),
        reset_links=data.get('reset_links', False),
        reset_schedules=data.get('reset_schedules', False),
        reset_categories=data.get('reset_categories', False),
        user_id=user.id,
        ip=request.remote_addr
    )

    return jsonify(result)
```

#### 2.8 Implementar Serviços de Backup e Reset

**Criar `backend/app/services/backup_service.py`:**

```python
import json
import os
from datetime import datetime
from app.models import User, Sector, Link, Schedule, Category, RolePermission
from app.extensions import db
from app.services.audit_service import AuditService

class BackupService:
    @staticmethod
    def export(include_all=True, include_users=False, include_sectors=False,
               include_links=False, include_schedules=False, include_categories=False,
               user_id=None, ip=None):

        # Se include_all, ativa tudo
        if include_all:
            include_users = include_sectors = include_links = True
            include_schedules = include_categories = True

        data = {
            "version": 1,
            "exported_at": datetime.utcnow().isoformat(),
            "flags": {
                "include_all": include_all,
                "include_users": include_users,
                "include_sectors": include_sectors,
                "include_links": include_links,
                "include_schedules": include_schedules,
                "include_categories": include_categories
            },
            "data": {}
        }

        if include_users:
            data["data"]["users"] = [u.to_dict() for u in User.query.filter_by(deleted_at=None).all()]

        if include_sectors:
            data["data"]["sectors"] = [s.to_dict() for s in Sector.query.filter_by(deleted_at=None).all()]

        if include_links:
            data["data"]["links"] = [l.to_dict() for l in Link.query.filter_by(deleted_at=None).all()]

        if include_schedules:
            data["data"]["schedules"] = [s.to_dict() for s in Schedule.query.filter_by(deleted_at=None).all()]

        if include_categories:
            data["data"]["categories"] = [c.to_dict() for c in Category.query.all()]

        # Sempre inclui RolePermissions
        data["data"]["role_permissions"] = [rp.to_dict() for rp in RolePermission.query.all()]

        # Salvar em arquivo
        backup_dir = os.getenv('BACKUP_DIRECTORY', './backups')
        os.makedirs(backup_dir, exist_ok=True)

        filename = f"backup-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.json"
        filepath = os.path.join(backup_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        AuditService.log(user_id, 'BACKUP_CREATED', details={'filename': filename}, ip=ip)

        return filepath

    @staticmethod
    def import_data(file, mode='merge', user_id=None, ip=None):
        data = json.load(file)

        # Validar versão
        if data.get('version') != 1:
            raise ValueError("Versão de backup não suportada")

        imported = {
            "users": 0,
            "sectors": 0,
            "links": 0,
            "schedules": 0,
            "categories": 0
        }

        # Se mode=replace, deletar dados existentes
        if mode == 'replace':
            Link.query.delete()
            Schedule.query.delete()
            Category.query.delete()
            User.query.delete()
            Sector.query.delete()
            db.session.commit()

        # Importar setores primeiro (FK)
        if 'sectors' in data['data']:
            for sector_data in data['data']['sectors']:
                sector = Sector(**sector_data)
                db.session.add(sector)
                imported['sectors'] += 1

        db.session.commit()

        # Importar usuários
        if 'users' in data['data']:
            for user_data in data['data']['users']:
                user = User(**user_data)
                db.session.add(user)
                imported['users'] += 1

        db.session.commit()

        # Importar categorias
        if 'categories' in data['data']:
            for cat_data in data['data']['categories']:
                category = Category(**cat_data)
                db.session.add(category)
                imported['categories'] += 1

        db.session.commit()

        # Importar links
        if 'links' in data['data']:
            for link_data in data['data']['links']:
                link = Link(**link_data)
                db.session.add(link)
                imported['links'] += 1

        # Importar schedules
        if 'schedules' in data['data']:
            for schedule_data in data['data']['schedules']:
                schedule = Schedule(**schedule_data)
                db.session.add(schedule)
                imported['schedules'] += 1

        db.session.commit()

        AuditService.log(user_id, 'BACKUP_IMPORTED', details={'mode': mode, 'imported': imported}, ip=ip)

        return imported
```

**Criar `backend/app/services/reset_service.py`:**

```python
from app.models import User, Sector, Link, Schedule, Category, RolePermission, AuditLog
from app.extensions import db
from app.enums import UserRole, UserStatus
from app.services.audit_service import AuditService
from werkzeug.security import generate_password_hash

class ResetService:
    @staticmethod
    def reset(reset_all=False, reset_users=False, reset_sectors=False,
              reset_links=False, reset_schedules=False, reset_categories=False,
              user_id=None, ip=None):

        if reset_all:
            reset_users = reset_sectors = reset_links = True
            reset_schedules = reset_categories = True

        deleted = {
            "users": 0,
            "sectors": 0,
            "links": 0,
            "schedules": 0,
            "categories": 0
        }

        # Ordem de deleção (respeitar FK)
        if reset_links or reset_users or reset_sectors:
            deleted['links'] = Link.query.delete()

        if reset_schedules or reset_users or reset_sectors:
            deleted['schedules'] = Schedule.query.delete()

        if reset_users:
            deleted['users'] = User.query.delete()

        if reset_sectors:
            deleted['sectors'] = Sector.query.delete()

        if reset_categories:
            deleted['categories'] = Category.query.delete()

        db.session.commit()

        # Seed de admin padrão
        admin_credentials = None
        if reset_users:
            admin = User(
                username='admin',
                matricula='admin',
                password_hash=generate_password_hash('admin'),
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE
            )
            db.session.add(admin)
            db.session.commit()

            admin_credentials = {
                "username": "admin",
                "password": "admin"
            }

        # Seed de RolePermissions
        ResetService.seed_permissions()

        AuditService.log(user_id, 'SYSTEM_RESET', details={'deleted': deleted}, ip=ip)

        return {
            **deleted,
            "admin_credentials": admin_credentials
        }

    @staticmethod
    def seed_permissions():
        # USER
        user_perm = RolePermission.query.filter_by(role=UserRole.USER).first()
        if not user_perm:
            user_perm = RolePermission(
                role=UserRole.USER,
                can_view_links=True,
                restrict_to_own_sector=True
            )
            db.session.add(user_perm)

        # MANAGER
        manager_perm = RolePermission.query.filter_by(role=UserRole.MANAGER).first()
        if not manager_perm:
            manager_perm = RolePermission(
                role=UserRole.MANAGER,
                can_view_dashboard=True,
                can_access_admin=True,
                can_view_users=True,
                can_create_users=True,
                can_edit_users=True,
                can_view_sectors=True,
                can_view_links=True,
                can_manage_links=True,
                can_manage_schedules=True,
                can_view_audit_logs=True,
                restrict_to_own_sector=True
            )
            db.session.add(manager_perm)

        # ADMIN
        admin_perm = RolePermission.query.filter_by(role=UserRole.ADMIN).first()
        if not admin_perm:
            admin_perm = RolePermission(
                role=UserRole.ADMIN,
                can_view_dashboard=True,
                can_access_admin=True,
                can_view_users=True,
                can_create_users=True,
                can_edit_users=True,
                can_delete_users=True,
                can_view_sectors=True,
                can_manage_sectors=True,
                can_view_links=True,
                can_manage_links=True,
                can_manage_categories=True,
                can_manage_schedules=True,
                can_backup_system=True,
                can_reset_system=True,
                can_view_audit_logs=True,
                can_manage_system_config=True,
                restrict_to_own_sector=False
            )
            db.session.add(admin_perm)

        db.session.commit()
```

#### 2.9 Atualizar Variáveis de Ambiente

**Modificar `.env.example` e `.env`:**

```env
# Banco de Dados
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/facilita

# Segurança
SECRET_KEY=facilita-prod-secret-change-me

# Flask
FLASK_DEBUG=0
FLASK_ENV=production

# Admin Padrão
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin

# Diretórios
BACKUP_DIRECTORY=./backups
UPLOAD_DIRECTORY=./uploads
EXPORT_DIRECTORY=./exports

# Backup Automático
BACKUP_ENABLED=true
BACKUP_DAILY_TIME=02:00
BACKUP_RETENTION_DAYS=30
```

### FASE 3: Testes e Migração de Dados (2-3 dias)

#### 3.1 Executar Migrations

```bash
cd backend
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/facilita
flask db upgrade
```

#### 3.2 Seed Inicial

**Criar `backend/scripts/seed.py`:**

```python
from app import create_app
from app.services.reset_service import ResetService

app = create_app()

with app.app_context():
    # Seed de permissões
    ResetService.seed_permissions()

    # Criar admin
    from app.models import User
    from app.enums import UserRole, UserStatus
    from werkzeug.security import generate_password_hash
    from app.extensions import db

    admin = User.query.filter_by(username='admin').first()
    if not admin:
        admin = User(
            username='admin',
            matricula='admin',
            password_hash=generate_password_hash('admin'),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db.session.add(admin)
        db.session.commit()
        print("Admin criado com sucesso!")
```

```bash
python backend/scripts/seed.py
```

#### 3.3 Importar Dados do SQLite

**Criar `backend/scripts/import_from_sqlite.py`:**

```python
import json
import sqlite3
from app import create_app
from app.models import User, Link, Schedule, Category, Color
from app.extensions import db
from app.enums import UserRole, UserStatus
from werkzeug.security import generate_password_hash

app = create_app()

def import_data():
    # Conectar ao SQLite antigo
    conn = sqlite3.connect('backend/instance/facilita.sqlite')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    with app.app_context():
        # Importar usuários
        cursor.execute("SELECT * FROM user")
        for row in cursor.fetchall():
            user = User(
                username=row['username'],
                password_hash=row['password_hash'],
                role=UserRole.ADMIN if row['is_admin'] else UserRole.USER,
                status=UserStatus.ACTIVE,
                theme=json.loads(row['theme']) if row['theme'] else None
            )
            db.session.add(user)

        # Importar categorias
        cursor.execute("SELECT * FROM category")
        for row in cursor.fetchall():
            category = Category(
                name=row['name'],
                color=row['color'],
                icon=row['icon'],
                admin_only=row['admin_only']
            )
            db.session.add(category)

        db.session.commit()

        # Importar links (após commit de users e categories para ter IDs)
        cursor.execute("SELECT * FROM link")
        for row in cursor.fetchall():
            # Buscar usuário e categoria pelos dados antigos
            user = User.query.filter_by(username=...).first()  # Adaptar lógica
            category = Category.query.filter_by(name=...).first()

            link = Link(
                title=row['title'],
                url=row['url'],
                user_id=user.id if user else None,
                category_id=category.id if category else None,
                color=row['color'],
                image_url=row['image_url'],
                file_url=row['file_url']
            )
            db.session.add(link)

        # Importar schedules
        cursor.execute("SELECT * FROM schedule")
        for row in cursor.fetchall():
            # Similar à importação de links
            pass

        db.session.commit()

    conn.close()
    print("Importação concluída!")

if __name__ == '__main__':
    import_data()
```

```bash
python backend/scripts/import_from_sqlite.py
```

#### 3.4 Testes Manuais

**Testar endpoints:**
1. Login com admin padrão
2. Criar setor
3. Criar usuário MANAGER vinculado ao setor
4. Criar usuário USER vinculado ao setor
5. Testar permissões (MANAGER não pode deletar setor)
6. Criar link vinculado a setor
7. Exportar backup completo
8. Importar backup (modo merge)
9. Visualizar logs de auditoria
10. Executar reset seletivo

**Atualizar testes automatizados (`tests/test_api.py`):**
- Adicionar testes para setores
- Adicionar testes para permissões
- Adicionar testes para backup/restore
- Adicionar testes para reset

### FASE 4: Atualização do Frontend (3-4 dias)

#### 4.1 Atualizar Tipos TypeScript

**Modificar `frontend/src/globals.d.ts`:**

```typescript
export enum UserRole {
  USER = 'USER',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export interface User {
  id: string;
  username: string;
  cpf?: string;
  matricula?: string;
  role: UserRole;
  status: UserStatus;
  sector_id?: string;
  theme?: Theme;
  created_at: string;
  updated_at: string;
}

export interface Sector {
  id: string;
  name: string;
  description?: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  user_count?: number;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  can_view_dashboard: boolean;
  can_access_admin: boolean;
  can_view_users: boolean;
  can_create_users: boolean;
  can_edit_users: boolean;
  can_delete_users: boolean;
  can_view_sectors: boolean;
  can_manage_sectors: boolean;
  can_view_links: boolean;
  can_manage_links: boolean;
  can_manage_categories: boolean;
  can_manage_schedules: boolean;
  can_backup_system: boolean;
  can_reset_system: boolean;
  can_view_audit_logs: boolean;
  can_manage_system_config: boolean;
  restrict_to_own_sector: boolean;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: any;
  ip?: string;
  created_at: string;
  user?: User;
}
```

#### 4.2 Criar Páginas Admin Novas

**Criar `frontend/src/pages/AdminSectors.tsx`:**

```tsx
import { useState, useEffect } from 'react';
import api from '../api';
import { Sector } from '../globals';

export default function AdminSectors() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSectors();
  }, []);

  const loadSectors = async () => {
    try {
      const response = await api.get('/api/sectors');
      setSectors(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createSector = async (name: string, description: string) => {
    try {
      await api.post('/api/sectors', { name, description });
      loadSectors();
    } catch (error) {
      console.error(error);
    }
  };

  // ... renderização
}
```

**Criar `frontend/src/pages/AdminBackup.tsx`:**

```tsx
import { useState } from 'react';
import api from '../api';

export default function AdminBackup() {
  const [loading, setLoading] = useState(false);

  const exportBackup = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/admin/backup/export', {
        include_all: true
      }, {
        responseType: 'blob'
      });

      // Download do arquivo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup-${new Date().toISOString()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const importBackup = async (file: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', 'merge');

      await api.post('/api/admin/backup/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Backup importado com sucesso!');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ... renderização
}
```

**Criar `frontend/src/pages/AdminAuditLogs.tsx`:**

```tsx
import { useState, useEffect } from 'react';
import api from '../api';
import { AuditLog } from '../globals';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const response = await api.get('/api/admin/audit-logs');
      setLogs(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  // ... renderização
}
```

#### 4.3 Atualizar Rotas

**Modificar `frontend/src/App.tsx`:**

```tsx
import AdminSectors from './pages/AdminSectors';
import AdminBackup from './pages/AdminBackup';
import AdminAuditLogs from './pages/AdminAuditLogs';

// ...

<Route path="/admin/sectors" element={<AdminSectors />} />
<Route path="/admin/backup" element={<AdminBackup />} />
<Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
```

#### 4.4 Criar Hook de Permissões

**Criar `frontend/src/hooks/usePermissions.ts`:**

```typescript
import { useState, useEffect } from 'react';
import api from '../api';
import { RolePermission } from '../globals';

export function usePermissions() {
  const [permissions, setPermissions] = useState<RolePermission | null>(null);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const response = await api.get('/api/auth/me');
      const user = response.data;

      const permResponse = await api.get(`/api/permissions/${user.role}`);
      setPermissions(permResponse.data);
    } catch (error) {
      console.error(error);
    }
  };

  const can = (permission: keyof RolePermission): boolean => {
    return permissions?.[permission] === true;
  };

  return { permissions, can };
}
```

**Uso:**

```tsx
import { usePermissions } from '../hooks/usePermissions';

function MyComponent() {
  const { can } = usePermissions();

  return (
    <>
      {can('can_backup_system') && (
        <button onClick={exportBackup}>Exportar Backup</button>
      )}
    </>
  );
}
```

### FASE 6: Documentação e Entrega (1 dia)

#### 6.1 Atualizar README.md

**Adicionar seções:**
- Estrutura de Permissões
- Sistema de Setores
- Backup e Restore
- Reset do Sistema
- Variáveis de Ambiente

#### 6.2 Criar Guia de Migração

**Criar `MIGRATION_GUIDE.md`:**

```markdown
# Guia de Migração - SQLite para PostgreSQL

## 1. Backup dos Dados Atuais
...

## 2. Atualizar Variáveis de Ambiente
...

## 3. Executar Migrations
...

## 4. Importar Dados Antigos
...

## 5. Validar Permissões
...
```

#### 6.3 Criar Changelog

**Criar `CHANGELOG.md`:**

```markdown
# Changelog

## [2.0.0] - 2024-XX-XX

### Added
- Sistema de setores/departamentos
- Permissões granulares por tipo de usuário
- 3 tipos de usuários (USER, MANAGER, ADMIN)
- Sistema de backup/restore automatizado
- Sistema de reset controlado
- Logs de auditoria
- Configurações persistentes (SystemConfig)
- Soft delete para User, Sector, Link, Schedule
- Migrations gerenciadas com Flask-Migrate

### Changed
- Migrado de SQLite para PostgreSQL
- IDs de Integer para UUID
- Campo `theme` de Text para JSON
- Campo `is_admin` substituído por `role`
- Autenticação refatorada com decorators

### Removed
- Migrations manuais via ALTER TABLE
```

---

## 4. ARQUIVOS CRÍTICOS A MODIFICAR/CRIAR

### Modificar:
1. `backend/app/__init__.py` - Adicionar Flask-Migrate, remover ALTER TABLE
2. `backend/app/models.py` - Reestruturar todos os modelos
3. `backend/app/routes/__init__.py` - Adaptar rotas existentes
4. `backend/requirements.txt` - Adicionar dependências
5. `.env` e `.env.example` - Novas variáveis
6. `frontend/src/globals.d.ts` - Novos tipos
7. `frontend/src/App.tsx` - Novas rotas

### Criar:
1. `backend/app/enums.py` - Enums UserRole e UserStatus
2. `backend/app/decorators.py` - Decorators de autorização
3. `backend/app/services/authorization_service.py`
4. `backend/app/services/audit_service.py`
5. `backend/app/services/sector_service.py`
6. `backend/app/services/backup_service.py`
7. `backend/app/services/reset_service.py`
8. `backend/app/routes/sectors.py`
9. `backend/app/routes/backup.py`
10. `backend/app/routes/reset.py`
11. `backend/app/routes/audit_logs.py`
12. `backend/scripts/seed.py`
13. `backend/scripts/export_sqlite_data.py`
14. `backend/scripts/import_from_sqlite.py`
15. `frontend/src/pages/AdminSectors.tsx`
16. `frontend/src/pages/AdminBackup.tsx`
17. `frontend/src/pages/AdminAuditLogs.tsx`
18. `frontend/src/hooks/usePermissions.ts`
19. `MIGRATION_GUIDE.md`
20. `CHANGELOG.md`

---

## 5. RISCOS E MITIGAÇÕES

### Risco 1: Perda de Dados Durante Migração
**Mitigação:**
- Backup completo antes de iniciar
- Testar importação em ambiente local
- Validar integridade dos dados após importação

### Risco 2: Incompatibilidade de Tipos de Dados
**Mitigação:**
- Testar migrations em banco vazio primeiro
- Mapear tipos SQLite → PostgreSQL antecipadamente
- Usar tipo JSON nativo do PostgreSQL

### Risco 3: Quebra de Funcionalidades Existentes
**Mitigação:**
- Executar suite de testes após cada fase
- Manter branch antiga como fallback
- Deploy gradual (dev → staging → prod)

### Risco 4: Complexidade do Sistema de Permissões
**Mitigação:**
- Seed de permissões bem definido
- Documentação clara de cada permissão
- Testes automatizados de autorização

---

## 6. CRONOGRAMA ESTIMADO

| Fase | Descrição | Duração | Dependências |
|------|-----------|---------|--------------|
| 1 | Preparação e Backup | 1-2 dias | - |
| 2 | Configuração Backend | 3-5 dias | Fase 1 |
| 3 | Testes e Migração de Dados | 2-3 dias | Fase 2 |
| 4 | Atualização Frontend | 3-4 dias | Fase 2 |
| 5 | Deploy | 1-2 dias | Fases 2, 3, 4 |
| 6 | Documentação e Entrega | 1 dia | Todas |
| **TOTAL** | | **11-17 dias** | |

---

## 7. CHECKLIST DE VALIDAÇÃO FINAL

### Backend:
- [ ] Migrations executam sem erros
- [ ] Seed cria admin e permissões padrão
- [ ] Todos os endpoints retornam 200/201/204
- [ ] Testes automatizados passam
- [ ] Auditoria registra ações CRUD
- [ ] Backup/restore funciona corretamente
- [ ] Reset controlado funciona
- [ ] Permissões são validadas corretamente
- [ ] Soft delete funciona

### Frontend:
- [ ] Login funciona
- [ ] Dashboard renderiza
- [ ] CRUD de setores funciona (ADMIN)
- [ ] CRUD de usuários funciona (ADMIN/MANAGER)
- [ ] CRUD de links funciona
- [ ] Backup/restore via UI funciona
- [ ] Logs de auditoria são exibidos
- [ ] Permissões ocultam/mostram elementos corretamente

### Infraestrutura:
- [ ] PostgreSQL aceita conexões
- [ ] Volumes persistem dados
- [ ] Nginx roteia corretamente
- [ ] Healthchecks funcionam

### Segurança:
- [ ] Senhas são hasheadas
- [ ] Sessões expiram corretamente
- [ ] CORS configurado corretamente
- [ ] SQL Injection não é possível (ORM)
- [ ] Permissões bloqueiam ações não autorizadas

---

## 8. PRÓXIMOS PASSOS RECOMENDADOS (Futuro)

1. **Migrar para JWT:**
   - Implementar tokens httpOnly
   - Refresh token strategy
   - Session storage no Redis

2. **Implementar Notificações:**
   - Email para ações críticas
   - Notificações in-app

3. **Melhorar Backup:**
   - Agendamento via cron (APScheduler)
   - Retenção automática de backups antigos
   - Backup incremental

4. **Dashboard em Tempo Real:**
   - WebSockets para atualizações live
   - Métricas e gráficos

5. **API REST mais robusta:**
   - Paginação
   - Filtros avançados
   - Ordenação
   - Rate limiting

6. **Testes E2E:**
   - Playwright ou Cypress
   - CI/CD com GitHub Actions

---

## 6. SCHEMA PRISMA CONSOLIDADO (SIMPLIFICADO)

```prisma
// ===== HIERARQUIA MULTI-EMPRESA =====
Company → Unit → Sector → User

// ===== CORE ENTITIES =====
- Company (id, name, cnpj, logoUrl, status)
- Unit (id, companyId, name, cnpj, status)
- Sector (id, companyId, unitId, name, description, status)
- User (id, companyId, unitId, sectorId, name, email, cpf, passwordHash, role, status, avatarUrl, theme)
- RefreshToken (id, userId, tokenHash, expiresAt, revokedAt)

// ===== FUNCIONALIDADES FACILITA =====
- Link (id, companyId, userId, sectorId, categoryId, title, url, description, color, imageUrl, audience, isPublic, order)
- UploadedSchedule (id, companyId, userId, sectorId, categoryId, title, fileUrl, fileName, fileSize, isPublic)
- Note (id, companyId, userId, sectorId, categoryId, title, content, color, imageUrl, audience, isPublic)
- Category (id, companyId, name, color, icon, adminOnly, status)

// ===== FUNCIONALIDADES EXTRAS (8 Selecionadas) =====
- Favorite (id, userId, entityType, linkId, scheduleId) ⭐
- LinkVersion (id, linkId, title, url, description, changedBy, changeReason) ⭐
- ActivityLog (id, userId, action, entityType, entityId, metadata, ip) ⭐
- AuditLog (id, userId, action, targetType, targetId, details, ip) ⭐
- SystemConfig (id, key, value, description, type, isEditable, category) ⭐

// ===== SISTEMA =====
- RolePermission (id, role, can_*, restrict_to_own_sector)
```

**Enums:**
```prisma
enum UserRole {
  SUPERADMIN    // Acesso total à plataforma
  ADMIN         // Admin de uma empresa
  USER  // Usuário final
}

enum UserStatus {
  ACTIVE
  INACTIVE
}

enum EntityStatus {
  ACTIVE
  INACTIVE
}

enum ContentAudience {
  PUBLIC      // Todos podem ver
  COMPANY     // Apenas empresa
  SECTOR      // Apenas setor
  PRIVATE     // Apenas criador
  ADMIN       // Apenas admins
  SUPERADMIN  // Apenas superadmin
}

enum EntityType {
  LINK
  SCHEDULE
  NOTE
  USER
  SECTOR
  COMPANY
}
```

**Total de Models**: 17 (enxuto e focado)

**Observações:**
- ✅ Models de Tags e Notificações removidos do schema (não serão implementados)
- ✅ Schema focado nas 8 funcionalidades extras priorizadas
- ✅ Suporte a Notes (recados) adicionado ao schema
- ✅ ContentAudience para controle granular de visibilidade

---

## 7. MELHORIAS SOBRE O CHECK-IN ORIGINAL

### UX/UI Mais Moderna
- Shadcn/ui (componentes acessíveis)
- Framer Motion (animações fluidas)
- Glassmorphism + gradientes
- Dark mode nativo
- PWA (instalável, notificações push)

### Performance
- Cache Redis (reduz carga no banco)
- Query optimization (índices Prisma)
- Lazy loading (Next.js)
- Compressão de imagens (Sharp)
- WebSockets (sem polling)

### Escalabilidade
- Multi-tenancy nativo (N empresas)
- Horizontal scaling (stateless JWT)
- Queue system (Bull + Redis)
- Rate limiting

### Recursos Exclusivos (vs CHECK-IN)
1. **Portal de Links/Agendas/Notas** (core do FACILITA)
2. **Multi-empresa nativo** (Company → Unit → Sector)
3. **Sistema de Favoritos** (login obrigatório)
4. **Busca Full-Text avançada** (PostgreSQL tsvector)
5. **Histórico de Versões** (rastreamento + rollback)
6. **Upload Avançado** (drag-drop, preview, compressão)
7. **Auditoria Completa** (interceptor automático)
8. **Feed de Atividades** (timeline admin)
9. **Configurações do Sistema** (persistentes)
10. **PWA** (instalável, funciona offline)
11. **UX/UI moderna** (Shadcn/ui, Framer Motion)

---

## 8. TRADE-OFFS E DECISÕES ARQUITETURAIS

### NestJS vs Flask
**Decisão**: NestJS
**Razão**: TypeScript end-to-end, modularidade, performance, arquitetura robusta

### JWT vs Sessions
**Decisão**: JWT + Refresh Tokens
**Razão**: Stateless, escalável, ideal para SPA, suporta múltiplos dispositivos

### REST vs GraphQL
**Decisão**: REST
**Razão**: Simplicidade, Swagger, caching fácil, menor curva de aprendizado

### Shadcn/ui vs Material-UI
**Decisão**: Shadcn/ui
**Razão**: Componentes copiáveis, Radix UI (acessível), Tailwind, customizável

---

## 9. RISCOS E MITIGAÇÕES

### Complexidade de Migração
**Risco**: Migrar dados do FACILITA Flask/SQLite
**Mitigação**: Script de migração dedicado, validação pós-migração, backup completo antes de iniciar

### Performance de Busca Full-Text
**Risco**: Lentidão em buscas com grandes volumes de dados
**Mitigação**: PostgreSQL tsvector com índices GIN, cache Redis de buscas frequentes, paginação

### Escalabilidade de Upload de Arquivos
**Risco**: Filesystem local não escala horizontalmente
**Mitigação**: Fase 1 (local com compressão Sharp), Fase 2 (S3/MinIO quando necessário)

### Auditoria de Alto Volume
**Risco**: Tabela de auditoria crescendo muito e impactando performance
**Mitigação**: Particionamento de tabela por data, arquivamento mensal, índices estratégicos

---

## 10. ESTIMATIVAS REALISTAS

### Tempo de Desenvolvimento

| Milestone | Descrição | Duração | Status |
|-----------|-----------|---------|--------|
| M1 | Setup Inicial e Fundação | ✅ CONCLUÍDO | - |
| M2 | Multi-Empresa + Portal FACILITA | ✅ CONCLUÍDO | - |
| M3 | 8 Funcionalidades Extras | 3-4 semanas | ⏳ EM ANDAMENTO |
| M4 | Produção e Polimento | 2-3 semanas | ⏳ PENDENTE |
| **RESTANTE** | | **5-7 semanas** | |

**Estimativa de Conclusão**: ~1.5-2 meses a partir de agora

### Custo de Infraestrutura

**Fase Inicial:**
- VPS Hetzner CPX21 (3vCPU 8GB): ~R$50/mês
- PostgreSQL + Redis: incluído
- Domain + SSL: R$40/ano
- Email (SendGrid free): R$0
- **TOTAL**: **~R$50/mês**

**Escalado (50-100 empresas):**
- VPS CPX31 (4vCPU 16GB): ~R$100/mês
- S3 Storage (MinIO ou Spaces): R$50/mês
- Email (SendGrid paid): R$50/mês
- **TOTAL**: **~R$200/mês**

---

## 11. PRÓXIMOS PASSOS IMEDIATOS

### Decisões Necessárias
1. ✅ Aprovação do plano arquitetural
2. ⏳ Escolha de ambiente: produção (VPS) ou local
3. ⏳ Repositório: novo repo ou branch no FACILITA atual?
4. ⏳ Domínio: escolher domínio (ex: facilita.chvc.com.br)

### Setup Inicial (Semana 1)
1. Criar estrutura de pastas (monorepo)
2. Setup NestJS backend + Prisma
3. Setup Next.js frontend + Shadcn/ui
4. Infraestrutura base (postgres, redis, backend, frontend, nginx)
5. Schema Prisma inicial
6. Auth JWT + Guards
7. Login page funcional

---

## 12. ARQUIVOS CRÍTICOS A CRIAR/MODIFICAR

### Backend - Status dos Módulos

**✅ IMPLEMENTADOS:**
1. `backend/src/auth/` - Autenticação JWT
2. `backend/src/companies/` - Multi-empresa
3. `backend/src/units/` - Unidades/Filiais
4. `backend/src/sectors/` - Setores
5. `backend/src/users/` - Usuários
6. `backend/src/links/` - Portal de Links
7. `backend/src/categories/` - Categorias
8. `backend/src/uploaded-schedules/` - Agendas/Arquivos
9. `backend/src/notes/` - Notas/Recados
10. `backend/src/uploads/` - Upload de arquivos (básico)
11. `backend/src/backups/` - Backup/Restore
12. `backend/src/resets/` - Reset do sistema
13. `backend/src/permissions/` - Permissões
14. `backend/src/health/` - Health Checks
15. `backend/src/prisma/` - Prisma ORM
16. `backend/src/common/` - Utilitários compartilhados

**❌ A IMPLEMENTAR (8 Funcionalidades Extras):**
1. `backend/src/favorites/` - Sistema de Favoritos
2. `backend/src/search/` - Busca Full-Text (PostgreSQL tsvector)
3. `backend/src/link-versions/` - Histórico de Versões
4. `backend/src/uploads/` - Enhancement: drag-drop, preview, compressão
5. `backend/src/audit-logs/` - Auditoria Completa (Interceptor)
6. `backend/src/activity-feed/` - Feed de Atividades
7. `backend/src/system-config/` - Configurações do Sistema
8. PWA - Service Worker (frontend)

### Frontend - Status das Páginas

**✅ IMPLEMENTADAS:**
1. `frontend/src/app/(auth)/login/` - Login
2. `frontend/src/app/(auth)/register/` - Registro
3. `frontend/src/app/(auth)/forgot-password/` - Esqueci a senha
4. `frontend/src/app/page.tsx` - Landing público (grid de links)
5. `frontend/src/app/(app)/dashboard/` - Dashboard principal
6. `frontend/src/app/(app)/admin/companies/` - Gestão de Empresas
7. `frontend/src/app/(app)/admin/units/` - Gestão de Unidades
8. `frontend/src/app/(app)/admin/sectors/` - Gestão de Setores
9. `frontend/src/app/(app)/admin/users/` - Gestão de Usuários
10. `frontend/src/app/(app)/admin/links/` - Gestão de Links
11. `frontend/src/app/(app)/admin/categories/` - Gestão de Categorias
12. `frontend/src/app/(app)/admin/schedules/` - Gestão de Agendas
13. `frontend/src/app/(app)/admin/notes/` - Gestão de Notas
14. `frontend/src/app/(app)/admin/backup/` - Backup/Restore
15. `frontend/src/app/(app)/admin/reset/` - Reset do Sistema
16. `frontend/src/app/(app)/admin/permissions/` - Permissões

**❌ A IMPLEMENTAR (8 Funcionalidades Extras):**
1. `frontend/src/app/(app)/my/favorites/` - Meus Favoritos
2. `frontend/src/app/(app)/search/` - Busca Avançada
3. `frontend/src/components/LinkVersionsModal/` - Modal de Histórico
4. `frontend/src/components/AdvancedUpload/` - Upload avançado
5. `frontend/src/app/(app)/admin/audit-logs/` - Logs de Auditoria
6. `frontend/src/components/ActivityFeed/` - Widget de Atividades
7. `frontend/src/app/(app)/admin/settings/` - Configurações do Sistema
8. `frontend/public/manifest.json` + Service Worker - PWA

### Schema Prisma
- `backend/prisma/schema.prisma` - Schema completo com 20+ models

### Configuração
- `.env.example` - Variáveis de ambiente
- `nginx/nginx.conf` - Proxy reverso

---

## CONCLUSÃO

O **FACILITA V2.0** será uma plataforma moderna e escalável que oferece:
1. **Portal de Links/Agendas/Arquivos** (FACILITA modernizado)
2. **Multi-empresa nativa** (Company → Unit → Sector → User)
3. **Backup/Reset automatizado** (inspirado no CHECK-IN)
4. **Permissões granulares por role** (SUPERADMIN, ADMIN, USER)
5. **8 Funcionalidades Extras Priorizadas**:
   - ✅ Sistema de Favoritos (login obrigatório)
   - ✅ Busca Avançada Full-Text (PostgreSQL tsvector)
   - ✅ Histórico de Versões (rastreabilidade + rollback)
   - ✅ Upload Avançado (drag-drop, preview, compressão)
   - ✅ Auditoria Completa (interceptor automático)
   - ✅ ActivityLog/Feed de Atividades (Admin/SuperAdmin)
   - ✅ Configurações do Sistema (persistentes)
   - ✅ PWA (instalável, offline, notificações)

Com stack moderna (NestJS + Next.js + PostgreSQL + Redis) e arquitetura multi-tenancy, o sistema está preparado para:
- Suportar múltiplas empresas/unidades/setores
- Escalar horizontalmente (stateless JWT, Redis cache)
- Oferecer UX superior (Shadcn/ui, Framer Motion, PWA)
- Facilitar manutenção (modularidade, TypeScript, testes)

**Status Atual**: Milestone 1 e 2 concluídos (50% do projeto)
**Restante**: 5-7 semanas (~1.5-2 meses)
**Investimento**: ~R$50/mês (infraestrutura inicial) | ~R$200/mês (escalado)
**Complexidade**: Média
**Retorno**: Plataforma unificada, moderna e diferenciada

---

## CHECKLIST DE IMPLEMENTAÇÃO - 8 FUNCIONALIDADES EXTRAS

### ✅ IMPLEMENTADO (Base)
- [x] Setup NestJS + Prisma + PostgreSQL
- [x] Autenticação JWT + Refresh Tokens
- [x] Multi-empresa (Company → Unit → Sector)
- [x] Portal FACILITA (Links, Schedules, Notes, Categories)
- [x] Sistema de permissões granulares
- [x] Backup/Reset do sistema
- [x] Upload básico de arquivos

### ❌ A IMPLEMENTAR (8 Funcionalidades Extras)

#### 1. Sistema de Favoritos
**Backend:**
- [ ] Criar `src/favorites/favorites.module.ts`
- [ ] Criar `src/favorites/favorites.service.ts`
- [ ] Criar `src/favorites/favorites.controller.ts`
- [ ] Criar DTOs: CreateFavoriteDto, RemoveFavoriteDto
- [ ] Endpoints: POST /favorites, DELETE /favorites/:id, GET /favorites/me
- [ ] Guard: apenas usuários autenticados

**Frontend:**
- [ ] Criar página `app/(app)/my/favorites/page.tsx`
- [ ] Botão de favoritar em cards de Links/Schedules/Notes
- [ ] Hook `useFavorites` com mutações
- [ ] Badge visual em items favoritados
- [ ] Filtros na página de favoritos

#### 2. Busca Avançada Full-Text
**Backend:**
- [ ] Criar `src/search/search.module.ts`
- [ ] Criar `src/search/search.service.ts`
- [ ] Criar `src/search/search.controller.ts`
- [ ] Implementar PostgreSQL tsvector + índices GIN
- [ ] Endpoint: GET /search?q=termo&filters=...
- [ ] Buscar em: links, schedules, notes (título, descrição, conteúdo)
- [ ] Filtros: categoria, setor, data, tipo
- [ ] Paginação de resultados

**Frontend:**
- [ ] Criar página `app/(app)/search/page.tsx`
- [ ] SearchBar global no header
- [ ] Highlight de termos encontrados
- [ ] Filtros combinados
- [ ] Resultados paginados

#### 3. Histórico de Versões
**Backend:**
- [ ] Implementar lógica no `LinksService.update()` para criar versão
- [ ] Endpoint: GET /links/:id/versions
- [ ] Endpoint: POST /links/:id/restore/:versionId
- [ ] Registrar: changedBy, changeReason, timestamp

**Frontend:**
- [ ] Criar `components/LinkVersionsModal.tsx`
- [ ] Botão "Ver Histórico" nas páginas de edição
- [ ] Componente de diff visual (comparação)
- [ ] Botão "Restaurar versão" com confirmação

#### 4. Upload Avançado
**Backend:**
- [ ] Integrar Sharp para compressão de imagens
- [ ] Endpoint de progresso: GET /uploads/progress/:id
- [ ] Validação de múltiplos formatos
- [ ] Suporte a múltiplos arquivos simultâneos

**Frontend:**
- [ ] Criar `components/AdvancedUpload.tsx`
- [ ] Drag & drop zone
- [ ] Preview de imagens e PDFs
- [ ] Barra de progresso
- [ ] Cropping de imagens (react-easy-crop)
- [ ] Validação client-side

#### 5. Auditoria Completa
**Backend:**
- [ ] Criar `src/audit-logs/audit-logs.module.ts`
- [ ] Criar `src/audit-logs/audit-logs.service.ts`
- [ ] Criar `src/audit-logs/audit-logs.controller.ts`
- [ ] Criar AuditInterceptor para registrar ações CRUD automaticamente
- [ ] Registrar: ação, tipo, ID, detalhes, IP, usuário
- [ ] Endpoint: GET /admin/audit-logs com filtros
- [ ] Export para CSV

**Frontend:**
- [ ] Criar página `app/(app)/admin/audit-logs/page.tsx`
- [ ] Filtros: usuário, ação, data, tipo de entidade
- [ ] Timeline view com avatares
- [ ] Export para CSV
- [ ] Guard: apenas Admin/SuperAdmin

#### 6. ActivityLog/Feed de Atividades
**Backend:**
- [ ] Criar `src/activity-feed/activity-feed.module.ts`
- [ ] Criar `src/activity-feed/activity-feed.service.ts`
- [ ] Criar `src/activity-feed/activity-feed.controller.ts`
- [ ] Lógica para registrar ações dos usuários
- [ ] Endpoint: GET /activity-feed (últimas 50 ações)
- [ ] Guard: apenas Admin/SuperAdmin

**Frontend:**
- [ ] Criar `components/ActivityFeed.tsx`
- [ ] Widget no dashboard admin
- [ ] "Fulano criou um novo link há 5 min"
- [ ] Ícones e avatares
- [ ] Filtrar por tipo de atividade
- [ ] Paginação infinita (scroll)

#### 7. Configurações do Sistema
**Backend:**
- [ ] Criar `src/system-config/system-config.module.ts`
- [ ] Criar `src/system-config/system-config.service.ts`
- [ ] Criar `src/system-config/system-config.controller.ts`
- [ ] Endpoints: CRUD de configurações
- [ ] Seeding de configs padrão (backup_directory, upload_directory, retention_days)
- [ ] Validação de paths
- [ ] Guard: apenas SuperAdmin

**Frontend:**
- [ ] Criar página `app/(app)/admin/settings/page.tsx`
- [ ] Forms para editar configs editáveis
- [ ] Mostrar configs não editáveis (read-only)
- [ ] Validação de paths no client
- [ ] Guard: apenas SuperAdmin

#### 8. PWA (Progressive Web App)
**Frontend:**
- [ ] Criar `public/manifest.json` com metadados do app
- [ ] Criar ícones PWA (192x192, 512x512)
- [ ] Implementar Service Worker para cache offline
- [ ] Configurar Next.js para gerar SW automaticamente
- [ ] Cache de assets estáticos
- [ ] Splash screen customizada
- [ ] Funcionalidade offline básica (visualização de favoritos)
- [ ] Add to Home Screen prompt

---

## PRÓXIMOS PASSOS IMEDIATOS

1. **Implementar Sistema de Favoritos** (mais rápido, alto valor)
2. **Implementar Busca Avançada** (alto impacto)
3. **Implementar Histórico de Versões** (rastreabilidade)
4. **Melhorar Upload** (UX superior)
5. **Implementar Auditoria Completa** (observabilidade)
6. **Implementar ActivityLog** (dashboard admin)
7. **Implementar Configurações do Sistema** (manutenibilidade)
8. **Implementar PWA** (experiência mobile)

**Ordem recomendada**: Favoritos → Busca → Histórico → Upload → Auditoria → Activity → Settings → PWA
