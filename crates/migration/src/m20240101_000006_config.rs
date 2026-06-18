use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

// Reserved ids (mirror of the seed migration).
const PLATFORM_TENANT_ID: i64 = 0;
const DEMO_TENANT_ID: i64 = 1000;
const DEMO_ADMIN_ROLE_ID: i64 = 1001;

const UP_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS sys_config (
    config_key   VARCHAR(128) PRIMARY KEY,
    config_value TEXT        NOT NULL DEFAULT '',
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO sys_config (config_key, config_value) VALUES
    ('site_name', 'Rust Axum Admin'),
    ('login_title', 'Rust Axum Admin'),
    ('login_subtitle', '多租户管理后台'),
    ('login_background', ''),
    ('logo_url', '')
ON CONFLICT (config_key) DO NOTHING;
"#;

const DOWN_SQL: &str = "DROP TABLE IF EXISTS sys_config;";

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(UP_SQL).await?;

        // "系统设置" menu (list) + the save button live in the platform menu pool.
        let menus = format!(
            "INSERT INTO sys_menu \
             (id, tenant_id, parent_id, name, type, path, component, perm, api_path, api_method) VALUES \
             (60, {PLATFORM_TENANT_ID}, 1, '系统设置', 2, '/system/config', 'system/config/index', 'system:config:list', '/api/v1/settings', 'GET'), \
             (61, {PLATFORM_TENANT_ID}, 60, '保存设置', 3, NULL, NULL, 'system:config:edit', '/api/v1/settings', 'PUT') \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&menus).await?;

        // grant the new menus to the demo tenant admin so the feature is usable
        // out of the box (mirrors how other module menus are seeded).
        let role_menu = format!(
            "INSERT INTO sys_role_menu (tenant_id, role_id, menu_id) VALUES \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 60), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 61) \
             ON CONFLICT (role_id, menu_id) DO NOTHING;"
        );
        conn.execute_unprepared(&role_menu).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("DELETE FROM sys_role_menu WHERE menu_id IN (60, 61);")
            .await?;
        conn.execute_unprepared("DELETE FROM sys_menu WHERE id IN (60, 61);")
            .await?;
        conn.execute_unprepared(DOWN_SQL).await?;
        Ok(())
    }
}
