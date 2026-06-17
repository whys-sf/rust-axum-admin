# rust-axum-admin

多租户管理后台后端，基于 **Rust + Axum 0.8 + SeaORM + Casbin**，实现用户 / 角色 / 菜单 / 权限管理，租户级行级隔离，RBAC with domains 鉴权。

## 技术选型

| 领域 | 选型 |
| --- | --- |
| Web 框架 | axum 0.8（路径参数语法 `{id}`） |
| ORM | sea-orm 1.1 + migration |
| 权限引擎 | casbin 2.20（RBAC with domains），sqlx-adapter 持久化到 `casbin_rule` |
| 数据库 | PostgreSQL |
| 缓存 / 会话 | Redis（JWT 黑名单、登录失败计数） |
| 认证 | JWT（access + refresh），Argon2 密码哈希 |
| 主键 | 雪花算法 BIGINT（自定义纪元 2024-01-01） |

## 工作区结构

```
crates/
├── common/      配置、错误、统一响应、JWT、密码、雪花、Redis
├── entity/      SeaORM 实体（tenant/user/role/menu/user_role/role_menu/operation_log）
├── migration/   建表迁移 + 种子数据
├── service/     业务逻辑（auth/user/role/menu/tenant/permission/log）+ Casbin 封装
└── server/      Axum HTTP 层（state/infra/middleware/handlers/routes/main）
```

依赖方向：`server → service → entity → common`，`migration → entity`。

## 多租户与权限模型

- **隔离方式**：共享库 + `tenant_id` 行级隔离。`tenant_id = 0` 为平台保留租户。
- **两级管理员**：平台超管（`is_platform = true`，跨租户）+ 租户管理员（租户内）。
- **Casbin 模型**（`rbac_model.conf`）：
  - 请求 `r = sub, dom, obj, act`，策略 `p = sub, dom, obj, act`，角色 `g = _, _, _`
  - 匹配器：`g(r.sub, p.sub, r.dom) && r.dom == p.dom && keyMatch2(r.obj, p.obj) && (r.act == p.act || p.act == "*")`
  - `dom = tenant_id`，保证跨租户隔离；`obj = API 路径`（如 `/api/v1/users/:id`），`act = HTTP 方法`
- **中间件顺序**：`auth → tenant → operation_log → casbin`。平台超管在 casbin 处短路放行。
- 启动时 `permission::rebuild_all` 从 `sys_role_menu` / `sys_user_role` 全量重建 Casbin 策略。

## 本地运行

```bash
# 1. 准备 PostgreSQL 与 Redis，创建数据库 admin
createdb admin

# 2. 配置环境变量
cp .env.example .env   # 按需修改 DATABASE_URL / REDIS_URL / JWT__SECRET

# 3. 启动（main 会自动跑迁移 + 重建 Casbin 策略）
cargo run -p server
# 监听 0.0.0.0:8080
```

迁移也可单独执行：`cargo run -p migration`。

### 种子账号

| 租户 | 用户名 | 密码 | 说明 |
| --- | --- | --- | --- |
| `platform` | `superadmin` | `Admin@123456` | 平台超管（跨租户） |
| `demo` | `admin` | `Admin@123456` | 演示租户管理员 |

## 主要接口（前缀 `/api/v1`）

| 方法 & 路径 | 说明 | 鉴权 |
| --- | --- | --- |
| `POST /auth/login` | 登录（`tenant_code` + `username` + `password`） | 公开 |
| `POST /auth/refresh` | 刷新令牌 | 公开 |
| `POST /auth/logout` | 登出（access token 加入黑名单） | 登录 |
| `GET /auth/userinfo` | 当前用户信息 + 角色 + 权限 | 登录 |
| `GET /auth/menus` | 当前用户菜单树 | 登录 |
| `GET/POST /users`、`.../{id}`、`.../{id}/status\|password\|roles` | 用户管理 | RBAC |
| `GET/POST /roles`、`.../{id}`、`.../{id}/menus\|status` | 角色管理 | RBAC |
| `GET/POST /menus`、`.../{id}` | 菜单管理 | RBAC |
| `GET /logs` | 操作日志 | RBAC |
| `GET/POST /platform/tenants`、`.../{id}`、`.../{id}/status` | 租户管理 | 仅平台超管 |

平台超管可通过 `X-Tenant-Id` 头切换操作的租户上下文。

## 校验

```bash
cargo build --workspace
cargo clippy --workspace --all-targets
cargo test --workspace
```
