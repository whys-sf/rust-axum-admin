use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const PLATFORM_TENANT_ID: i64 = 0;
const DEMO_TENANT_ID: i64 = 1000;
const DEMO_ADMIN_ROLE_ID: i64 = 1001;

const UP_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS sys_post (
    id         BIGINT       PRIMARY KEY,
    tenant_id  BIGINT       NOT NULL,
    code       VARCHAR(64)  NOT NULL,
    name       VARCHAR(128) NOT NULL,
    sort       INT          NOT NULL DEFAULT 0,
    status     SMALLINT     NOT NULL DEFAULT 1,
    remark     VARCHAR(255),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_post_code ON sys_post (tenant_id, code);

CREATE TABLE IF NOT EXISTS sys_param (
    id          BIGINT       PRIMARY KEY,
    tenant_id   BIGINT       NOT NULL,
    name        VARCHAR(128) NOT NULL,
    param_key   VARCHAR(128) NOT NULL,
    param_value VARCHAR(512) NOT NULL,
    param_type  SMALLINT     NOT NULL DEFAULT 2,
    remark      VARCHAR(255),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_param_key ON sys_param (tenant_id, param_key);

CREATE TABLE IF NOT EXISTS sys_notice (
    id          BIGINT       PRIMARY KEY,
    tenant_id   BIGINT       NOT NULL,
    title       VARCHAR(255) NOT NULL,
    notice_type SMALLINT     NOT NULL DEFAULT 1,
    content     TEXT         NOT NULL DEFAULT '',
    status      SMALLINT     NOT NULL DEFAULT 1,
    created_by  BIGINT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notice_tenant ON sys_notice (tenant_id);
"#;

const DOWN_SQL: &str = "DROP TABLE IF EXISTS sys_post; DROP TABLE IF EXISTS sys_param; DROP TABLE IF EXISTS sys_notice;";

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(UP_SQL).await?;

        // demo seed rows so each module has something to operate on.
        let seed = format!(
            "INSERT INTO sys_post (id, tenant_id, code, name, sort) VALUES \
             (1400, {DEMO_TENANT_ID}, 'ceo', '董事长', 0), \
             (1401, {DEMO_TENANT_ID}, 'dev', '研发工程师', 1) \
             ON CONFLICT (id) DO NOTHING; \
             INSERT INTO sys_param (id, tenant_id, name, param_key, param_value, param_type, remark) VALUES \
             (1410, {DEMO_TENANT_ID}, '账号自助-是否开启验证码', 'sys.account.captcha', 'true', 1, '内置参数') \
             ON CONFLICT (id) DO NOTHING; \
             INSERT INTO sys_notice (id, tenant_id, title, notice_type, content, status) VALUES \
             (1420, {DEMO_TENANT_ID}, '欢迎使用管理后台', 2, '这是一条示例公告。', 1) \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&seed).await?;

        // menus + buttons for the three modules. api_path follows the existing
        // convention: exact path for list/create, `/:id` for update/delete
        // (keyMatch2 matches `:id` against a single path segment).
        let menus = format!(
            "INSERT INTO sys_menu \
             (id, tenant_id, parent_id, name, type, path, component, perm, api_path, api_method) VALUES \
             (80, {PLATFORM_TENANT_ID}, 1, '岗位管理', 2, '/system/post', 'system/post/index', 'system:post:list', '/api/v1/posts', 'GET'), \
             (81, {PLATFORM_TENANT_ID}, 80, '岗位新增', 3, NULL, NULL, 'system:post:create', '/api/v1/posts', 'POST'), \
             (82, {PLATFORM_TENANT_ID}, 80, '岗位修改', 3, NULL, NULL, 'system:post:update', '/api/v1/posts/:id', 'PUT'), \
             (83, {PLATFORM_TENANT_ID}, 80, '岗位删除', 3, NULL, NULL, 'system:post:delete', '/api/v1/posts/:id', 'DELETE'), \
             (90, {PLATFORM_TENANT_ID}, 1, '参数配置', 2, '/system/param', 'system/param/index', 'system:param:list', '/api/v1/params', 'GET'), \
             (91, {PLATFORM_TENANT_ID}, 90, '参数新增', 3, NULL, NULL, 'system:param:create', '/api/v1/params', 'POST'), \
             (92, {PLATFORM_TENANT_ID}, 90, '参数修改', 3, NULL, NULL, 'system:param:update', '/api/v1/params/:id', 'PUT'), \
             (93, {PLATFORM_TENANT_ID}, 90, '参数删除', 3, NULL, NULL, 'system:param:delete', '/api/v1/params/:id', 'DELETE'), \
             (100, {PLATFORM_TENANT_ID}, 1, '通知公告', 2, '/system/notice', 'system/notice/index', 'system:notice:list', '/api/v1/notices', 'GET'), \
             (101, {PLATFORM_TENANT_ID}, 100, '公告新增', 3, NULL, NULL, 'system:notice:create', '/api/v1/notices', 'POST'), \
             (102, {PLATFORM_TENANT_ID}, 100, '公告修改', 3, NULL, NULL, 'system:notice:update', '/api/v1/notices/:id', 'PUT'), \
             (103, {PLATFORM_TENANT_ID}, 100, '公告删除', 3, NULL, NULL, 'system:notice:delete', '/api/v1/notices/:id', 'DELETE') \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&menus).await?;

        let role_menu = format!(
            "INSERT INTO sys_role_menu (tenant_id, role_id, menu_id) VALUES \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 80), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 81), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 82), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 83), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 90), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 91), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 92), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 93), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 100), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 101), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 102), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 103) \
             ON CONFLICT (role_id, menu_id) DO NOTHING;"
        );
        conn.execute_unprepared(&role_menu).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            "DELETE FROM sys_role_menu WHERE menu_id IN (80,81,82,83,90,91,92,93,100,101,102,103); \
             DELETE FROM sys_menu WHERE id IN (80,81,82,83,90,91,92,93,100,101,102,103);",
        )
        .await?;
        conn.execute_unprepared(DOWN_SQL).await?;
        Ok(())
    }
}
