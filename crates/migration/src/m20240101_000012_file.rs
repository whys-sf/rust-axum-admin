use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const PLATFORM_TENANT_ID: i64 = 0;
const DEMO_TENANT_ID: i64 = 1000;
const DEMO_ADMIN_ROLE_ID: i64 = 1001;

const UP_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS sys_file (
    id            BIGINT       PRIMARY KEY,
    tenant_id     BIGINT       NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    object_key    VARCHAR(512) NOT NULL,
    content_type  VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
    size          BIGINT       NOT NULL DEFAULT 0,
    is_public     BOOLEAN      NOT NULL DEFAULT false,
    created_by    BIGINT       NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_file_tenant ON sys_file (tenant_id, created_at DESC);
"#;

const DOWN_SQL: &str = "DROP TABLE IF EXISTS sys_file;";

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(UP_SQL).await?;

        let menus = format!(
            "INSERT INTO sys_menu \
             (id, tenant_id, parent_id, name, type, path, component, perm, api_path, api_method) VALUES \
             (140, {PLATFORM_TENANT_ID}, 1, '文件管理', 2, '/tool/file', 'tool/file/index', 'system:file:list', '/api/v1/files', 'GET'), \
             (141, {PLATFORM_TENANT_ID}, 140, '上传文件', 3, NULL, NULL, 'system:file:upload', '/api/v1/files', 'POST'), \
             (142, {PLATFORM_TENANT_ID}, 140, '删除文件', 3, NULL, NULL, 'system:file:delete', '/api/v1/files/:id', 'DELETE'), \
             (143, {PLATFORM_TENANT_ID}, 140, '下载文件', 3, NULL, NULL, 'system:file:list', '/api/v1/files/:id/download', 'GET') \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&menus).await?;

        let role_menu = format!(
            "INSERT INTO sys_role_menu (tenant_id, role_id, menu_id) VALUES \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 140), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 141), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 142), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 143) \
             ON CONFLICT (role_id, menu_id) DO NOTHING;"
        );
        conn.execute_unprepared(&role_menu).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            "DELETE FROM sys_role_menu WHERE menu_id IN (140,141,142,143); \
             DELETE FROM sys_menu WHERE id IN (140,141,142,143);",
        )
        .await?;
        conn.execute_unprepared(DOWN_SQL).await?;
        Ok(())
    }
}
