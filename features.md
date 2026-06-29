---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '3c3d2e32-cb28-42ec-a074-ce28261b7dfb'
  PropagateID: '3c3d2e32-cb28-42ec-a074-ce28261b7dfb'
  ReservedCode1: '78271323-775e-48b6-8351-0346c50ce642'
  ReservedCode2: '78271323-775e-48b6-8351-0346c50ce642'
---

# Rust Axum Admin 功能清单

> 多租户 SaaS 管理后台，前后端一体。Rust + Axum 后端 + React 前端。

---

## 一、项目概览

| 项 | 说明 |
|---|---|
| 定位 | 多租户管理后台（SaaS），共享库 + 行级租户隔离 |
| 后端 | Rust + Axum 0.8 + SeaORM 1.1 + Casbin 2 + PostgreSQL + Redis + MinIO |
| 前端 | React 19 + TypeScript + Vite 8 + TanStack Router/Query + shadcn/ui + Tailwind CSS v4 |
| 工作区 | `common` → `entity` → `migration` → `service` → `server`，`web/` 为独立前端 |
| 种子账号 | `superadmin/Admin@123456`（平台超管）、`admin/Admin@123456`（演示租户管理员） |

---

## 二、技术栈

### 后端

| 领域 | 技术 | 版本 |
|---|---|---|
| Web 框架 | axum + axum-extra | 0.8 / 0.10 |
| 中间件 | tower / tower-http | 0.5 / 0.6 |
| 异步运行时 | tokio | 1 |
| ORM | sea-orm + sea-orm-migration | 1.1 |
| 权限引擎 | casbin + sqlx-adapter | 2.x / 1 |
| Redis | deadpool-redis | 0.18 |
| JWT | jsonwebtoken | 9 |
| 密码哈希 | argon2 | 0.5 |
| OpenAPI | utoipa + utoipa-swagger-ui | 5 / 9 |
| 对象存储 | rust-s3 (MinIO) | 0.35 |
| 系统监控 | sysinfo | 0.32 |
| 定时任务 | cron | 0.17 |
| 代码生成 | zip | 2 |
| 配置 | config + dotenvy | 0.15 |
| 日志 | tracing + tracing-subscriber | 0.1 / 0.3 |
| 数据库 | PostgreSQL 16 | — |
| 缓存 | Redis 7 | — |
| 对象存储 | MinIO (S3 兼容) | — |

### 前端

| 领域 | 技术 | 版本 |
|---|---|---|
| UI 框架 | React | ^19.2 |
| 构建工具 | Vite | ^8.0 |
| 语言 | TypeScript | ~6.0 |
| 路由 | TanStack Router (文件路由) | ^1.170 |
| 状态管理 | Zustand (+ persist) | ^5.0 |
| 数据请求 | TanStack React Query | ^5.101 |
| HTTP | Axios | ^1.18 |
| UI 组件 | shadcn/ui + Radix UI | radix-nova 风格 |
| 样式 | Tailwind CSS v4 + tw-animate-css | ^4.3 |
| 表格 | TanStack React Table | ^8.21 |
| 图标 | Lucide React | ^1.20 |
| 表单验证 | Zod | ^4.4 |
| 通知 | Sonner | ^2.0 |
| 包管理 | pnpm | — |

---

## 三、后端功能清单

### 3.1 Workspace 结构

```
rust-axum-admin/
├── crates/
│   ├── common/        公共基础库（配置、JWT、密码、Redis、雪花ID、错误、响应）
│   ├── entity/        SeaORM 数据库实体（28 个表）
│   ├── migration/     数据库迁移（20 个迁移 + 种子数据）
│   ├── service/       业务逻辑层（22 个模块 + DTO + 代码生成模板）
│   └── server/        HTTP 层（18 个 handler + 4 个中间件 + 路由组装 + OpenAPI）
├── config/            TOML 配置（default / development / production）
├── rbac_model.conf    Casbin RBAC-with-domains 模型
├── web/               React 前端
├── docker-compose.yml / docker-compose.dev.yml
├── Dockerfile
└── .github/           CI/CD（ci.yml + integration.yml）
```

### 3.2 common crate — 公共基础库

| 模块 | 文件 | 功能 |
|---|---|---|
| 配置 | `config.rs` | `Settings` 结构体，7 个子配置节，三层合并（default.toml < {RUN_MODE}.toml < 环境变量） |
| JWT | `jwt.rs` | 双令牌签发/验证（access + refresh），Claims 含 user_id/tenant_id/is_platform/jti/iat |
| 密码 | `password.rs` | Argon2id 哈希/验证 |
| Redis | `redis.rs` | 连接池 + 8 组工具函数（黑名单、登录限锁、在线会话、分布式锁、密码 epoch、缓存信息） |
| 雪花ID | `snowflake.rs` | 自定义 epoch (2024-01-01) 的雪花算法 |
| 错误 | `error.rs` | `AppError` 枚举（BadRequest/Unauthorized/Forbidden/TenantDisabled/TenantExpired/NotFound/Conflict/Db/Casbin/Other） |
| 响应 | `response.rs` | `PageResult<T>` 分页结构 |

### 3.3 entity crate — 数据库实体（28 张表）

| 表名 | 说明 |
|---|---|
| `sys_tenant` | 租户 |
| `sys_user` | 用户 |
| `sys_role` | 角色 |
| `sys_menu` | 菜单（目录/菜单/按钮三种类型） |
| `sys_user_role` | 用户-角色关联 |
| `sys_role_menu` | 角色-菜单关联 |
| `sys_role_dept` | 角色-部门关联（数据权限） |
| `sys_dept` | 部门（树形，含 ancestors） |
| `sys_operation_log` | 操作日志 |
| `sys_config` | 系统设置（租户级 KV，复合主键 tenant_id + config_key） |
| `sys_dict_type` | 字典类型 |
| `sys_dict_item` | 字典项（支持树形） |
| `sys_post` | 岗位 |
| `sys_param` | 参数配置 |
| `sys_notice` | 通知公告 |
| `sys_message` | 消息 |
| `sys_message_receiver` | 消息接收人（已读状态） |
| `sys_job` | 定时任务 |
| `sys_job_log` | 任务执行日志 |
| `sys_gen_table` | 代码生成-表配置 |
| `sys_gen_column` | 代码生成-列配置 |
| `sys_file` | 文件附件 |
| `sys_file_folder` | 文件夹 |
| `sys_feature` | 功能特性（全局开关） |
| `sys_package` | 套餐 |
| `sys_package_feature` | 套餐-功能关联 |
| `sys_tenant_feature` | 租户-功能开关 |
| `casbin_rule` | Casbin 策略（自动创建） |

> Snowflake ID (i64) 序列化为 JSON string，避免 JS 精度丢失。提供 4 个 serde helper。

### 3.4 service crate — 业务逻辑层

| 模块 | 功能 |
|---|---|
| `auth` | 登录/刷新/登出/获取用户信息/菜单树构建 |
| `permission` | Casbin 策略同步/重建/执行检查 |
| `data_scope` | 5 级行级数据权限（全部/自定义/本部门/本部门及以下/仅本人） |
| `online` | 在线会话管理（Redis） |
| `user` | 用户 CRUD + 状态/密码/角色分配 |
| `role` | 角色 CRUD + 菜单/部门分配 |
| `menu` | 菜单 CRUD + 树构建 |
| `dept` | 部门 CRUD + 树构建 + 子树查询 |
| `dict` | 字典类型/项 CRUD |
| `post` | 岗位 CRUD |
| `param` | 参数 CRUD（内置参数保护） |
| `notice` | 通知公告 CRUD |
| `config` | 站点设置（KV 读写） |
| `message` | 消息发送 + 收件箱 |
| `job` | 定时任务 CRUD + 调度器 + 处理器注册 |
| `file` | 文件上传/下载/移动/文件夹管理（MinIO） |
| `monitor` | 服务器/Redis 监控 |
| `gen` | 代码生成器（导入表/生成代码/预览/下载 zip） |
| `log` | 操作日志查询 |
| `tenant` | 租户 CRUD + 事务化初始化 |
| `feature` | 功能开关管理 |
| `package` | 套餐管理 |

### 3.5 server crate — HTTP 层

#### 中间件（4 层）

| 层级 | 中间件 | 功能 |
|---|---|---|
| 第 1 层 | `auth::guard` | JWT 验证 → 黑名单检查 → 密码 epoch 检查 → 注入 CurrentUser |
| 第 2 层 | `tenant::resolve` | 租户解析（X-Tenant-Id 代理/固定租户/禁用过期检查） |
| 第 3 层 | `operation_log::record` | 记录 POST/PUT/DELETE/PATCH 请求到操作日志 |
| 第 4 层 | `casbin_auth::guard` | RBAC-with-domains 权限检查（keyMatch2 路径匹配） |

#### 路由分组

| 分组 | 中间件 | 包含的模块 |
|---|---|---|
| Public（公开） | 无 | login、refresh、public/settings、public/files |
| Identity（身份） | auth + tenant | logout、userinfo、menus、my/messages（收件箱） |
| RBAC（权限） | auth + tenant + oplog + casbin | users、roles、menus、depts、dicts、posts、params、notices、messages（管理）、jobs、gen、monitor、logs、settings、files |
| Platform（平台超管） | auth + platform_only | tenants、packages、features |

#### 全局中间件

- TraceLayer（请求追踪）
- CorsLayer（CORS 跨域）
- TimeoutLayer（请求超时）
- RequestBodyLimitLayer（请求体大小限制）

---

## 四、安全与权限体系

### 4.1 认证机制

- JWT 双令牌：access_token + refresh_token，各有独立 TTL
- Argon2id 密码哈希
- Redis 黑名单：logout 时将 token jti 加入黑名单
- 密码 Epoch：修改密码后旧 token 失效
- 登录限速：每账号 15 分钟 5 次失败锁定；每 IP 15 分钟 30 次限流
- 在线会话：Redis 追踪活跃 token

### 4.2 RBAC 权限模型

```
[request_definition]  r = sub, dom, obj, act
[policy_definition]   p = sub, dom, obj, act
[role_definition]     g = _, _, _         (RBAC-with-domains)
[matchers]            m = g(r.sub, p.sub, r.dom) && r.dom == p.dom
                      && keyMatch2(r.obj, p.obj) && (r.act == p.act || p.act == "*")
```

- sub = user_id / role_code
- dom = tenant_id（租户域隔离）
- obj = API 路径（支持 keyMatch2 通配）
- act = HTTP 方法（支持 `*` 通配）
- 策略持久化到 PostgreSQL `casbin_rule` 表
- 平台超管（is_platform=true）绕过 Casbin

### 4.3 行级数据权限

| 值 | 级别 | 说明 |
|---|---|---|
| 1 | 全部数据 | 不加过滤 |
| 2 | 自定义 | 指定部门集合（sys_role_dept） |
| 3 | 本部门 | 仅本部门数据 |
| 4 | 本部门及以下 | 本部门 + 子部门 |
| 5 | 仅本人 | 仅自己创建的数据 |

### 4.4 多租户隔离

- 字段级隔离：所有业务表含 `tenant_id`
- 平台租户 ID = 0，平台用户 `is_platform = true`
- 平台超管可通过 `X-Tenant-Id` 请求头代理任意租户
- 租户状态检查：禁用 → 40301，过期 → 40302
- 租户创建时事务化初始化：admin 角色 + 首个管理员 + 基础菜单

### 4.5 套餐与功能门控

- `sys_feature`：全局功能特性定义
- `sys_package`：套餐定义（含默认用户上限）
- `sys_package_feature`：套餐-功能关联
- `sys_tenant_feature`：租户级功能开关
- 租户按套餐获得功能，可独立开关

---

## 五、API 接口完整清单

> 所有 API 前缀 `/api/v1`，统一响应 `{ code, message, data }`。共计约 83 个端点。

### 5.1 认证（5）

| 方法 | 路径 | 认证 | 功能 |
|---|---|---|---|
| POST | `/auth/login` | 无 | 登录 |
| POST | `/auth/refresh` | 无 | 刷新令牌 |
| POST | `/auth/logout` | Bearer | 退出登录 |
| GET | `/auth/userinfo` | Bearer | 当前用户信息 |
| GET | `/auth/menus` | Bearer | 当前用户菜单树 |
| PUT | `/profile/password` | RBAC | 修改本人密码 |

### 5.2 用户管理（9）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/users` | 用户列表（数据权限过滤） |
| GET | `/users/{id}` | 用户详情（含角色 ID） |
| POST | `/users` | 创建用户 |
| PUT | `/users/{id}` | 更新用户 |
| DELETE | `/users/{id}` | 删除用户 |
| PUT | `/users/{id}/status` | 启用/禁用 |
| PUT | `/users/{id}/password` | 重置密码 |
| PUT | `/users/{id}/roles` | 分配角色 |

### 5.3 角色管理（10）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/roles` | 角色列表 |
| GET | `/roles/{id}` | 角色详情 |
| POST | `/roles` | 创建角色 |
| PUT | `/roles/{id}` | 更新角色 |
| DELETE | `/roles/{id}` | 删除角色 |
| GET | `/roles/{id}/menus` | 已分配菜单 ID |
| PUT | `/roles/{id}/menus` | 分配菜单（同步 Casbin） |
| GET | `/roles/{id}/depts` | 自定义数据范围部门 ID |
| PUT | `/roles/{id}/depts` | 分配数据范围 |
| PUT | `/roles/{id}/status` | 启用/禁用 |

### 5.4 菜单管理（5）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/menus` | 菜单树 |
| GET | `/menus/{id}` | 菜单详情 |
| POST | `/menus` | 创建菜单 |
| PUT | `/menus/{id}` | 更新菜单 |
| DELETE | `/menus/{id}` | 删除菜单 |

### 5.5 部门管理（5）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/depts` | 部门树 |
| GET | `/depts/{id}` | 部门详情 |
| POST | `/depts` | 创建部门 |
| PUT | `/depts/{id}` | 更新部门 |
| DELETE | `/depts/{id}` | 删除部门 |

### 5.6 字典管理（10）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/dicts/types` | 字典类型列表 |
| GET | `/dicts/types/{id}` | 字典类型详情 |
| POST | `/dicts/types` | 创建字典类型 |
| PUT | `/dicts/types/{id}` | 更新字典类型 |
| DELETE | `/dicts/types/{id}` | 删除字典类型（级联） |
| GET | `/dicts/types/{id}/items` | 按类型 ID 取字典项 |
| GET | `/dicts/code/{code}/items` | 按编码取字典项 |
| POST | `/dicts/items` | 创建字典项 |
| PUT | `/dicts/items/{id}` | 更新字典项 |
| DELETE | `/dicts/items/{id}` | 删除字典项 |

### 5.7 岗位管理（5）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/posts` | 岗位列表 |
| GET | `/posts/{id}` | 岗位详情 |
| POST | `/posts` | 创建岗位 |
| PUT | `/posts/{id}` | 更新岗位 |
| DELETE | `/posts/{id}` | 删除岗位 |

### 5.8 参数配置（5）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/params` | 参数列表 |
| GET | `/params/{id}` | 参数详情 |
| POST | `/params` | 创建参数 |
| PUT | `/params/{id}` | 更新参数 |
| DELETE | `/params/{id}` | 删除参数（内置保护） |

### 5.9 通知公告（5）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/notices` | 公告列表 |
| GET | `/notices/{id}` | 公告详情 |
| POST | `/notices` | 创建公告 |
| PUT | `/notices/{id}` | 更新公告 |
| DELETE | `/notices/{id}` | 删除公告 |

### 5.10 消息中心（9）

| 方法 | 路径 | 认证 | 功能 |
|---|---|---|---|
| GET | `/messages` | RBAC | 已发送消息列表 |
| POST | `/messages` | RBAC | 发送消息（广播/指定收件人） |
| DELETE | `/messages/{id}` | RBAC | 删除消息 |
| GET | `/my/messages` | Bearer | 个人收件箱 |
| GET | `/my/messages/unread-count` | Bearer | 未读消息数 |
| GET | `/my/messages/{id}` | Bearer | 查看消息（自动标记已读） |
| PUT | `/my/messages/{id}/read` | Bearer | 标记已读 |
| PUT | `/my/messages/read-all` | Bearer | 全部标记已读 |
| DELETE | `/my/messages/{id}` | Bearer | 从收件箱删除 |

### 5.11 定时任务（8）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/jobs` | 任务列表 |
| GET | `/jobs/{id}` | 任务详情 |
| POST | `/jobs` | 创建任务 |
| PUT | `/jobs/{id}` | 更新任务 |
| DELETE | `/jobs/{id}` | 删除任务 |
| PUT | `/jobs/{id}/status` | 启用/停用 |
| POST | `/jobs/{id}/run` | 立即执行 |
| GET | `/job-logs` | 执行日志 |

### 5.12 代码生成器（8）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/gen/db-tables` | 数据库物理表列表 |
| GET | `/gen/tables` | 已导入配置列表 |
| POST | `/gen/import` | 导入物理表 |
| GET | `/gen/tables/{id}` | 配置详情（含列） |
| PUT | `/gen/tables/{id}` | 更新配置 |
| DELETE | `/gen/tables/{id}` | 删除配置 |
| GET | `/gen/tables/{id}/preview` | 预览生成代码 |
| GET | `/gen/tables/{id}/download` | 下载代码 ZIP |

### 5.13 文件管理（10）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/file-folders` | 文件夹列表 |
| POST | `/file-folders` | 创建文件夹 |
| PUT | `/file-folders/{id}` | 重命名文件夹 |
| DELETE | `/file-folders/{id}` | 删除空文件夹 |
| GET | `/files` | 文件列表（分页/搜索/文件夹） |
| POST | `/files` | 上传文件（multipart，公开/私有） |
| PUT | `/files/{id}/move` | 移动文件 |
| DELETE | `/files/{id}` | 删除文件 |
| GET | `/files/{id}/download` | 下载文件（鉴权） |
| GET | `/public/files/{id}` | 公开文件下载（免鉴权） |

### 5.14 系统监控（4）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/online` | 在线用户列表 |
| DELETE | `/online/{token}` | 强制下线 |
| GET | `/monitor/server` | 服务器资源监控 |
| GET | `/monitor/cache` | Redis 缓存监控 |

### 5.15 操作日志（1）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/logs` | 操作日志列表（分页/搜索） |

### 5.16 系统设置（3）

| 方法 | 路径 | 认证 | 功能 |
|---|---|---|---|
| GET | `/public/settings` | 无 | 公开站点设置 |
| GET | `/settings` | RBAC | 站点设置 |
| PUT | `/settings` | RBAC | 更新站点设置 |

### 5.17 租户管理（6，平台级）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/platform/tenants` | 租户列表 |
| GET | `/platform/tenants/{id}` | 租户详情 |
| POST | `/platform/tenants` | 创建租户（事务化初始化） |
| PUT | `/platform/tenants/{id}` | 更新租户 |
| PUT | `/platform/tenants/{id}/status` | 启用/禁用租户 |
| DELETE | `/platform/tenants/{id}` | 删除租户 |

### 5.18 套餐/功能管理（5，平台级）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/platform/features` | 功能特性列表 |
| GET | `/platform/packages` | 套餐列表 |
| POST | `/platform/packages` | 创建套餐 |
| PUT | `/platform/packages/{id}` | 更新套餐 |
| DELETE | `/platform/packages/{id}` | 删除套餐 |

### 5.19 健康检查（1）

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/health` | 健康检查（返回 "ok"） |

---

## 六、前端功能清单

### 6.1 页面/路由（27 个页面）

| 路由 | 页面组件 | 功能 |
|---|---|---|
| `/login` | LoginPage | 登录页（双栏布局，租户编码+用户名+密码，站点设置动态展示） |
| `/_app/` | DashboardPage | 仪表盘（用户/角色/部门/租户统计卡片） |
| `/_app/users` | UsersPage | 用户管理（列表/新增/编辑/删除/重置密码/分配角色） |
| `/_app/roles` | RolesPage | 角色管理（列表/新增/编辑/删除/分配菜单/分配部门/启停） |
| `/_app/menus` | MenusPage | 菜单管理（树形列表/新增/编辑/删除） |
| `/_app/depts` | DeptsPage | 部门管理（树形列表/新增/编辑/删除） |
| `/_app/dict/` | DictTypesPage | 字典类型管理（列表/新增/编辑/删除） |
| `/_app/dict/items` | DictItemsPage | 字典项管理（支持树形/平铺） |
| `/_app/posts` | PostsPage | 岗位管理（列表/新增/编辑/删除） |
| `/_app/params` | ParamsPage | 参数配置（列表/新增/编辑/删除） |
| `/_app/notices` | NoticesPage | 通知公告（列表/新增/编辑/删除） |
| `/_app/messages` | MessagesPage | 消息中心（收件箱+发件管理，Tabs 切换） |
| `/_app/jobs` | JobsPage | 定时任务（列表/启停/立即执行/执行日志） |
| `/_app/gen` | GenPage | 代码生成器（导入表/配置/预览/下载） |
| `/_app/files` | FilesPage | 文件管理（文件夹树+文件列表/上传/下载/移动/删除） |
| `/_app/online` | OnlinePage | 在线用户（列表/强制下线，10 秒轮询） |
| `/_app/monitor` | MonitorPage | 服务监控（CPU/内存/磁盘/Redis，5 秒轮询，SVG 环形图） |
| `/_app/logs` | LogsPage | 操作日志（列表/搜索/请求体详情查看） |
| `/_app/settings` | SettingsPage | 系统设置（站点标识/登录页配置，实时预览） |
| `/_app/profile` | ProfilePage | 个人中心（信息展示+修改密码） |
| `/_app/tenants` | TenantsPage | 租户管理（平台级，列表/创建/启停） |
| `/_app/packages` | PackagesPage | 套餐管理（平台级，列表/新增/编辑/功能分配） |
| `/_app/course/` | CoursePage | 课程管理（业务扩展，同步课件） |
| `/_app/task/` | — | 任务管理（占位页，待实现） |

### 6.2 前端 API 模块（19 个文件）

`src/lib/api/` 下每个文件对应一个业务域：

| 文件 | 覆盖接口 |
|---|---|
| `auth.ts` | 登录/登出/用户信息/菜单/改密 |
| `user.ts` | 用户 CRUD + 状态/密码/角色 |
| `role.ts` | 角色 CRUD + 菜单/部门分配 |
| `menu.ts` | 菜单 CRUD |
| `dept.ts` | 部门 CRUD |
| `dict.ts` | 字典类型/项 CRUD |
| `post.ts` | 岗位 CRUD |
| `param.ts` | 参数 CRUD |
| `notice.ts` | 通知 CRUD |
| `message.ts` | 消息发送/收件箱/已读/删除 |
| `job.ts` | 任务 CRUD + 执行/日志 |
| `gen.ts` | 代码生成全流程 |
| `files.ts` | 文件/文件夹管理 |
| `monitor.ts` | 在线用户/服务器/Redis 监控 |
| `log.ts` | 操作日志查询 |
| `tenant.ts` | 租户管理（平台级） |
| `package.ts` | 套餐/功能管理（平台级） |
| `settings.ts` | 系统设置 |
| `types.ts` | 全局 TypeScript 类型定义 |

### 6.3 公共组件

#### 业务组件（13 个）

| 组件 | 功能 |
|---|---|
| ManagementPage | 管理页面 Hero 布局包装器（标题+描述+指标卡片） |
| DataTable | 核心数据表格（分页/排序/筛选/列显隐/行选择/骨架屏） |
| PagePagination | 分页器 |
| TableToolbar | 表格搜索工具栏 |
| DeleteConfirmDialog | 删除确认对话框（红色警告风格） |
| ConfirmDialog | 通用确认对话框 |
| DialogHeroHeader | 对话框统一头部（图标+标题+描述） |
| DialogStatusSwitch | 对话框状态开关 |
| FormField | 表单字段包装器（图标+标签+必填标记） |
| StatusBadge | 状态徽章 |
| TreeCheckbox | 树形多选复选框（父子联动三态） |
| LucideIconPicker | Lucide 图标选择器（52 个预设+搜索） |
| ThemeToggle | 主题切换器（亮/暗/系统 + 6 色主色） |

#### shadcn/ui 基础组件（26 个）

Button, Input, Textarea, Label, Field, Select, Checkbox, Switch, Dialog, AlertDialog, Sheet, DropdownMenu, Table, Tabs, Badge, Avatar, Card, Skeleton, Separator, ScrollArea, Popover, Progress, Tooltip, Breadcrumb, Sidebar, Sonner

### 6.4 状态管理

| Store | Key | 内容 |
|---|---|---|
| `stores/auth.ts` | `aa-auth` | token, refreshToken, user, actingTenantId |
| `stores/theme.ts` | `aa-theme` | mode (light/dark/system), color (6 色预设) |

### 6.5 主题系统

- 亮色/暗色/跟随系统三种模式
- 6 种主色预设（默认/蓝/绿/紫/玫红/橙）
- CSS 变量动态覆盖，OKLCH 色彩空间
- 持久化到 localStorage，监听系统暗色模式变化

### 6.6 权限控制（前端三级）

1. **路由级**：`_app` 布局 `beforeLoad` 检查 token
2. **菜单级**：后端菜单树 + 功能特性列表动态渲染侧边栏
3. **操作级**：`usePermission(perm)` Hook 控制 CRUD 按钮显隐

权限标识格式：`module:resource:action`（如 `system:user:list`），平台管理员 bypass。

### 6.7 消息通知系统

- 顶栏未读消息铃铛（30 秒轮询，Popover 弹出列表）
- 消息中心（收件箱+发件管理）
- 支持系统通知（全员广播）和站内信（指定收件人）
- 查看消息后自动标记已读

### 6.8 文件上传

- 文件管理模块：文件夹分类、公开/私有上传、移动、下载、复制链接
- 图片缩略图预览
- 系统设置页面内嵌图片上传
- 课件封面/视频选择

---

## 七、基础设施与部署

### 7.1 配置系统

三层合并：`config/default.toml` < `config/{RUN_MODE}.toml` < 环境变量（`__` 分隔符）

| 配置节 | 配置项 |
|---|---|
| server | addr, cors_allowed_origins, enable_swagger, auto_migrate, enable_scheduler, trust_forwarded_for |
| database | url, max_connections |
| redis | url |
| jwt | secret (≥32 字符), access_ttl, refresh_ttl |
| snowflake | worker_id, datacenter_id |
| casbin | model_path |
| storage | endpoint, region, bucket, access_key, secret_key, path_style |

### 7.2 Docker 部署

| 服务 | 镜像 | 端口 |
|---|---|---|
| postgres | postgres:16-alpine | 5432 |
| redis | redis:7-alpine | 6379 |
| minio | minio/minio:latest | 9000 (API) / 9001 (Console) |
| app | 本地构建 | 8080 |

- `docker-compose.yml`：全栈部署（含 app）
- `docker-compose.dev.yml`：仅基础设施（postgres + redis + minio），用于本地 `cargo run` 开发
- Dockerfile：两阶段构建（rust:1-builder → debian:bookworm-slim-runtime）

### 7.3 CI/CD

| 流水线 | 触发 | 内容 |
|---|---|---|
| `ci.yml` | push to develop/main + PR | cargo fmt --check → cargo clippy (-D warnings) → cargo test --workspace |
| `integration.yml` | 同上 | PostgreSQL + Redis + MinIO 服务容器 → cargo test --test api --ignored --test-threads=1 |

### 7.4 数据库迁移

20 个迁移（m20240101_000001 ~ m20240101_000020），含初始建表、种子数据、增量变更。可独立执行 `cargo run -p migration`。

### 7.5 代码生成器

从数据库物理表导入 → 自动生成列配置 → 可微调 → 预览/下载。生成 6 个文件：

1. Rust Entity（SeaORM 模型）
2. Rust Service（CRUD 业务逻辑）
3. Rust Handler（Axum 路由处理）
4. TypeScript 类型定义
5. TypeScript API 调用层
6. React 页面组件

### 7.6 定时任务调度器

- 5 秒轮询 Redis 分布式锁，仅持锁实例执行
- 内置处理器：`demo:heartbeat`、`demo:cleanup`
- 支持手动立即执行
- 执行结果写入 `sys_job_log`
- 通过 `server.enable_scheduler` 配置开关

### 7.7 OpenAPI 文档

- utoipa 自动生成，17 个 tag，约 80 个 path
- Swagger UI（开发模式启用，生产模式关闭）
- 访问路径：`/swagger-ui`、`/api-docs`

---

## 八、功能统计汇总

| 维度 | 数量 |
|---|---|
| 后端 API 端点 | ~83 个 |
| 数据库表 | 28 张（含 casbin_rule） |
| 数据库迁移 | 20 个 |
| 前端页面 | 27 个（含 1 个占位页） |
| 前端 API 模块 | 19 个 |
| 前端业务公共组件 | 13 个 |
| 前端 shadcn/ui 组件 | 26 个 |
| 后端中间件 | 4 层 |
| 业务功能模块 | 22 个 service 模块 |

> AI生成
