use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const PLATFORM_TENANT_ID: i64 = 0;
const DEMO_TENANT_ID: i64 = 1000;
const DEMO_ADMIN_ROLE_ID: i64 = 1001;

const UP_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS sys_gen_table (
    id            BIGINT       PRIMARY KEY,
    tenant_id     BIGINT       NOT NULL,
    table_name    VARCHAR(128) NOT NULL,
    class_name    VARCHAR(128) NOT NULL,
    module_name   VARCHAR(64)  NOT NULL,
    function_name VARCHAR(64)  NOT NULL,
    remark        VARCHAR(255),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_gen_table ON sys_gen_table (tenant_id, table_name);

CREATE TABLE IF NOT EXISTS sys_gen_column (
    id             BIGINT       PRIMARY KEY,
    tenant_id      BIGINT       NOT NULL,
    table_id       BIGINT       NOT NULL,
    column_name    VARCHAR(128) NOT NULL,
    column_comment VARCHAR(255) NOT NULL DEFAULT '',
    column_type    VARCHAR(64)  NOT NULL DEFAULT '',
    rust_type      VARCHAR(64)  NOT NULL DEFAULT 'String',
    ts_type        VARCHAR(32)  NOT NULL DEFAULT 'string',
    is_pk          BOOLEAN      NOT NULL DEFAULT false,
    is_required    BOOLEAN      NOT NULL DEFAULT false,
    is_insert      BOOLEAN      NOT NULL DEFAULT true,
    is_edit        BOOLEAN      NOT NULL DEFAULT true,
    is_list        BOOLEAN      NOT NULL DEFAULT true,
    is_query       BOOLEAN      NOT NULL DEFAULT false,
    sort           INTEGER      NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gen_column_table ON sys_gen_column (table_id);
"#;

const DOWN_SQL: &str = "DROP TABLE IF EXISTS sys_gen_column; DROP TABLE IF EXISTS sys_gen_table;";

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(UP_SQL).await?;

        let menus = format!(
            "INSERT INTO sys_menu \
             (id, tenant_id, parent_id, name, type, path, component, perm, api_path, api_method) VALUES \
             (130, {PLATFORM_TENANT_ID}, 1, '代码生成', 2, '/tool/gen', 'tool/gen/index', 'system:gen:list', '/api/v1/gen/tables', 'GET'), \
             (131, {PLATFORM_TENANT_ID}, 130, '导入表', 3, NULL, NULL, 'system:gen:import', '/api/v1/gen/import', 'POST'), \
             (132, {PLATFORM_TENANT_ID}, 130, '配置修改', 3, NULL, NULL, 'system:gen:edit', '/api/v1/gen/tables/:id', 'PUT'), \
             (133, {PLATFORM_TENANT_ID}, 130, '配置删除', 3, NULL, NULL, 'system:gen:delete', '/api/v1/gen/tables/:id', 'DELETE'), \
             (134, {PLATFORM_TENANT_ID}, 130, '预览代码', 3, NULL, NULL, 'system:gen:preview', '/api/v1/gen/tables/:id/preview', 'GET'), \
             (135, {PLATFORM_TENANT_ID}, 130, '下载代码', 3, NULL, NULL, 'system:gen:preview', '/api/v1/gen/tables/:id/download', 'GET'), \
             (136, {PLATFORM_TENANT_ID}, 130, '查看库表', 3, NULL, NULL, 'system:gen:list', '/api/v1/gen/db-tables', 'GET'), \
             (137, {PLATFORM_TENANT_ID}, 130, '配置详情', 3, NULL, NULL, 'system:gen:list', '/api/v1/gen/tables/:id', 'GET') \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&menus).await?;

        let role_menu = format!(
            "INSERT INTO sys_role_menu (tenant_id, role_id, menu_id) VALUES \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 130), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 131), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 132), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 133), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 134), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 135), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 136), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 137) \
             ON CONFLICT (role_id, menu_id) DO NOTHING;"
        );
        conn.execute_unprepared(&role_menu).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            "DELETE FROM sys_role_menu WHERE menu_id IN (130,131,132,133,134,135,136,137); \
             DELETE FROM sys_menu WHERE id IN (130,131,132,133,134,135,136,137);",
        )
        .await?;
        conn.execute_unprepared(DOWN_SQL).await?;
        Ok(())
    }
}
