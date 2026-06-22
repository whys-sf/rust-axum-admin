# rust-axum-admin

多租户管理后台，前后端一体。后端基于 **Rust + Axum 0.8 + SeaORM + Casbin**，前端基于 **React + TypeScript + Vite + shadcn/ui**。实现完整的 RBAC with domains 权限模型、`tenant_id` 行级租户隔离，以及一整套企业级后台常用模块（用户/角色/菜单/部门/数据权限/字典/岗位/参数/公告/消息/定时任务/代码生成/文件管理/在线用户/服务监控等）。

## 功能总览

### 认证与安全
- JWT 双令牌（access + refresh），refresh 轮换 + 黑名单，Argon2id 密码哈希。
- 登录失败账号级锁定计数（Redis），登录 IP 级限流。
- JWT 密钥启动期硬校验（拒绝默认占位/<32 字符），生产期 CORS 白名单。
- `jti` 使用 UUID v4；改密后写 Redis password-epoch 强制旧令牌失效。
- 全局请求体大小限制（默认 1 MiB，文件上传单独放宽）+ 请求超时（30s）。
- `X-Forwarded-For` 仅在 `trust_forwarded_for=true` 时信任。
- Swagger/OpenAPI 生产环境默认关闭（`enable_swagger` 门控）。

### 多租户与权限
- **隔离方式**：共享库 + `tenant_id` 行级隔离，`tenant_id = 0` 为平台保留租户。
- **两级管理员**：平台超管（`is_platform = true`，跨租户）+ 租户管理员（租户内）。
- **Casbin RBAC with domains**：`dom = tenant_id` 保证跨租户隔离，`obj = API 路径`，`act = HTTP 方法`；平台超管短路放行。
- 启动时从 `sys_role_menu` / `sys_user_role` 全量重建 Casbin 策略。

### 业务模块
| 模块 | 说明 |
| --- | --- |
| 用户管理 | CRUD、启停、重置密码、分配角色、个人改密 |
| 角色管理 | CRUD、启停、分配菜单、分配数据范围部门 |
| 菜单管理 | 树形菜单（目录/菜单/按钮），驱动前端动态菜单 + 权限标识 |
| 部门管理 | `sys_dept` 树形组织架构 |
| 数据权限 | 角色数据范围 5 档（全部/自定义/本部门/本部门及以下/仅本人），多角色并集；作用于用户、操作日志、部门树列表 |
| 字典管理 | 一套表支持**树形 + 非树形**（`is_tree` 标识，`parent_id` 嵌套），含标签样式 |
| 岗位管理 | `sys_post` 标准 CRUD |
| 参数配置 | `sys_param` 键值配置，区分内置/自定义（内置禁删） |
| 通知公告 | `sys_notice`，含类型 + 发布状态 |
| 消息中心 / 站内信 | `sys_message` + 每用户独立已读状态，支持广播全租户或指定收件人；个人收件箱 + 未读数 |
| 定时任务调度 | `sys_job` + `sys_job_log`，cron 六段式（含秒），拉取式调度器（5s tick），启停/立即执行/日志 |
| 代码生成器 | 反射 PostgreSQL 表 → 导入 → 可视化配列 → 生成 entity/service/handler + 前端 types/api/page，预览 + zip 下载 |
| 文件/附件管理 | `sys_file` 元数据 + MinIO(S3) 对象存储，上传/列表/删除/下载，系统设置 Logo/登录背景图可上传 |
| 在线用户 / 强制下线 | Redis 会话（按 access-token `jti` 登记），强制下线 = 拉黑 token + 提升 password epoch；租户隔离 |
| 服务 / 缓存监控 | `sysinfo` 采集 CPU/内存/磁盘/系统信息，解析 Redis `INFO`+`DBSIZE` |
| 操作日志 | 中间件自动记录请求方法/路径/耗时/操作人，按数据权限过滤 |
| 系统设置 | `sys_config` 键值表，公开接口供登录页读取站点名/标题/Logo/背景图，管理端可视化编辑 |
| 租户管理 | 平台超管专属，租户 CRUD + 启停 |

### 前端特性
- 路由从后端 `/auth/menus` **动态渲染**，侧边栏按权限门控。
- 主题切换：6 个主色预设（OKLch）+ 亮/暗/跟随系统，覆盖 CSS 变量并持久化。
- 雪花 ID 全程以 string 传输，无 BIGINT 精度丢失。
- 顶栏未读消息铃铛（轮询），toast 提示，shadcn/ui 组件（CLI 安装，不手写）。

## 技术选型

### 后端
| 领域 | 选型 |
| --- | --- |
| Web 框架 | axum 0.8（路径参数语法 `{id}`） |
| ORM | sea-orm 1.1 + migration |
| 权限引擎 | casbin 2.x（RBAC with domains），sqlx-adapter 持久化到 `casbin_rule` |
| 数据库 | PostgreSQL |
| 缓存 / 会话 | Redis（JWT 黑名单、登录失败计数、在线会话、password-epoch） |
| 认证 | JWT（access + refresh），Argon2id 密码哈希 |
| 对象存储 | MinIO / S3（`rust-s3`） |
| 系统监控 | `sysinfo` |
| 定时任务 | 自研拉取式 cron 调度器 |
| API 文档 | utoipa + utoipa-swagger-ui |
| 主键 | 雪花算法 BIGINT（自定义纪元 2024-01-01），序列化为 string |

### 前端
React 18 + TypeScript + Vite，`@tanstack/react-router`（file 模式）+ `@tanstack/react-query`，Tailwind CSS v4 + shadcn/ui（radix-ui），zustand，zod，axios，lucide-react，sonner。

## 工作区结构

```
crates/
├── common/      配置、错误、统一响应、JWT、密码、雪花、Redis
├── entity/      SeaORM 实体（user/role/menu/dept/dict/post/param/notice/
│                message/job/gen/file/config/tenant/operation_log 等）
├── migration/   建表迁移（13 个迁移）+ 种子数据
├── service/     业务逻辑（auth/user/role/menu/dept/data_scope/dict/post/
│                param/notice/message/job/gen/file/online/monitor/config/
│                permission/log）+ Casbin 封装
└── server/      Axum HTTP 层（state/infra/middleware/handlers/routes/
                 openapi/main）
web/
├── src/routes/_app/   路由文件（file 模式，仅放路由声明）
├── src/features/      页面内容（按模块分组）
├── src/components/    通用组件（shadcn CLI 安装）
├── src/layout/        布局组件
└── src/lib/           http / api / store 等
```

依赖方向：`server → service → entity → common`，`migration → entity`。

## 本地运行

### 方式一：Docker Compose（推荐，含 Postgres + Redis + MinIO）

```bash
docker compose up -d
# app 监听 :8080；MinIO 控制台 :9001（minioadmin/minioadmin）
```

### 方式二：本地裸跑

```bash
# 1. 准备 PostgreSQL / Redis / MinIO，创建数据库 admin
createdb admin

# 2. 配置环境变量
cp .env.example .env   # 按需修改 DATABASE_URL / REDIS_URL / JWT__SECRET / S3 配置

# 3. 启动后端（main 会自动跑迁移 + 重建 Casbin 策略）
cargo run -p server      # 监听 0.0.0.0:8080

# 4. 启动前端
cd web && npm install && npm run dev   # 监听 :5173
```

迁移也可单独执行：`cargo run -p migration`。

### 种子账号

| 租户 | 用户名 | 密码 | 说明 |
| --- | --- | --- | --- |
| `platform` | `superadmin` | `Admin@123456` | 平台超管（跨租户） |
| `demo` | `admin` | `Admin@123456` | 演示租户管理员 |

## 主要接口（前缀 `/api/v1`）

中间件顺序（最外层优先）：`auth → tenant → operation_log → casbin`。

### 公开
| 方法 & 路径 | 说明 |
| --- | --- |
| `POST /auth/login` | 登录（`tenant_code` + `username` + `password`） |
| `POST /auth/refresh` | 刷新令牌 |
| `GET /public/settings` | 站点公开设置（登录页用） |
| `GET /public/files/{id}` | 公开文件下载（Logo/背景图） |

### 身份（登录即可，无权限门控）
| 方法 & 路径 | 说明 |
| --- | --- |
| `POST /auth/logout` | 登出（access token 加入黑名单） |
| `GET /auth/userinfo` | 当前用户信息 + 角色 + 权限 |
| `GET /auth/menus` | 当前用户菜单树（前端动态渲染） |
| `PUT /profile/password` | 修改本人密码 |
| `GET /my/messages`、`.../unread-count`、`.../{id}`、`.../{id}/read`、`.../read-all` | 个人收件箱 / 未读数 / 已读 |

### RBAC 资源（按 Casbin 鉴权）
| 方法 & 路径 | 说明 |
| --- | --- |
| `/users`、`/users/{id}`、`.../status\|password\|roles` | 用户管理 |
| `/roles`、`/roles/{id}`、`.../menus\|depts\|status` | 角色管理（含分配数据范围） |
| `/menus`、`/menus/{id}` | 菜单管理 |
| `/depts`、`/depts/{id}` | 部门管理 |
| `/dicts/types`、`.../{id}/items`、`/dicts/code/{code}/items`、`/dicts/items` | 字典管理 |
| `/posts`、`/params`、`/notices` 及各自 `/{id}` | 岗位 / 参数 / 公告 |
| `/messages`、`/messages/{id}` | 消息发送 / 管理 |
| `/jobs`、`/jobs/{id}`、`.../status\|run`、`/job-logs` | 定时任务调度 |
| `/gen/db-tables\|import\|tables`、`.../{id}/preview\|download` | 代码生成器 |
| `/files`、`/files/{id}`、`.../download` | 文件/附件管理 |
| `/online`、`DELETE /online/{token}` | 在线用户 / 强制下线 |
| `/monitor/server`、`/monitor/cache` | 服务 / 缓存监控 |
| `/logs` | 操作日志 |
| `/settings`（GET/PUT） | 系统设置 |

### 平台超管专属
| 方法 & 路径 | 说明 |
| --- | --- |
| `/platform/tenants`、`.../{id}`、`.../{id}/status` | 租户管理 |

平台超管可通过 `X-Tenant-Id` 头切换操作的租户上下文。启用 Swagger 时文档在 `/swagger-ui`，OpenAPI JSON 在 `/api-docs/openapi.json`。

## 校验

```bash
# 后端
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
# 集成测试（需 Postgres + Redis）：CI 的 integration 工作流以 --ignored 运行

# 前端
cd web && npm run lint && npm run build
```

## CI

- `.github/workflows/ci.yml`：fmt + clippy + test（后端）。
- `.github/workflows/integration.yml`：带 Postgres + Redis 服务容器，以 `--ignored` 跑端到端集成测试。
