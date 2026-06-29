use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const PLATFORM_TENANT_ID: i64 = 0;
const DEMO_TENANT_ID: i64 = 1000;
const DEMO_ADMIN_ROLE_ID: i64 = 1001;

const UP_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS sys_file_folder (
    id         BIGINT       PRIMARY KEY,
    tenant_id  BIGINT       NOT NULL,
    name       VARCHAR(120) NOT NULL,
    sort       INTEGER      NOT NULL DEFAULT 0,
    created_by BIGINT       NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_file_folder_tenant_name ON sys_file_folder (tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_file_folder_tenant_sort ON sys_file_folder (tenant_id, sort, created_at DESC);
ALTER TABLE sys_file ADD COLUMN IF NOT EXISTS folder_id BIGINT NULL;
CREATE INDEX IF NOT EXISTS idx_file_tenant_folder ON sys_file (tenant_id, folder_id, created_at DESC);
"#;

const DOWN_SQL: &str = r#"
DROP INDEX IF EXISTS idx_file_tenant_folder;
ALTER TABLE sys_file DROP COLUMN IF EXISTS folder_id;
DROP TABLE IF EXISTS sys_file_folder;
"#;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(UP_SQL).await?;

        let menus = format!(
            "INSERT INTO sys_menu \
             (id, tenant_id, parent_id, name, type, path, component, perm, api_path, api_method) VALUES \
             (144, {PLATFORM_TENANT_ID}, 140, '文件夹列表', 3, NULL, NULL, 'system:file:list', '/api/v1/file-folders', 'GET'), \
             (145, {PLATFORM_TENANT_ID}, 140, '创建文件夹', 3, NULL, NULL, 'system:file:upload', '/api/v1/file-folders', 'POST'), \
             (146, {PLATFORM_TENANT_ID}, 140, '更新文件夹', 3, NULL, NULL, 'system:file:upload', '/api/v1/file-folders/:id', 'PUT'), \
             (147, {PLATFORM_TENANT_ID}, 140, '删除文件夹', 3, NULL, NULL, 'system:file:delete', '/api/v1/file-folders/:id', 'DELETE'), \
             (148, {PLATFORM_TENANT_ID}, 140, '移动文件', 3, NULL, NULL, 'system:file:upload', '/api/v1/files/:id/move', 'PUT') \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&menus).await?;

        let role_menu = format!(
            "INSERT INTO sys_role_menu (tenant_id, role_id, menu_id) VALUES \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 144), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 145), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 146), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 147), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 148) \
             ON CONFLICT (role_id, menu_id) DO NOTHING;"
        );
        conn.execute_unprepared(&role_menu).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            "DELETE FROM sys_role_menu WHERE menu_id IN (144,145,146,147,148); \
             DELETE FROM sys_menu WHERE id IN (144,145,146,147,148);",
        )
        .await?;
        conn.execute_unprepared(DOWN_SQL).await?;
        Ok(())
    }
}
