use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const PLATFORM_TENANT_ID: i64 = 0;
const DEMO_TENANT_ID: i64 = 1000;
const DEMO_ADMIN_ROLE_ID: i64 = 1001;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        let menus = format!(
            "INSERT INTO sys_menu \
             (id, tenant_id, parent_id, name, type, path, component, perm, api_path, api_method) VALUES \
             (150, {PLATFORM_TENANT_ID}, 1, '在线用户', 2, '/monitor/online', 'monitor/online/index', 'system:online:list', '/api/v1/online', 'GET'), \
             (151, {PLATFORM_TENANT_ID}, 150, '强制下线', 3, NULL, NULL, 'system:online:kick', '/api/v1/online/:token', 'DELETE'), \
             (160, {PLATFORM_TENANT_ID}, 1, '服务监控', 2, '/monitor/server', 'monitor/server/index', 'system:monitor:list', '/api/v1/monitor/server', 'GET'), \
             (161, {PLATFORM_TENANT_ID}, 160, '缓存监控', 3, NULL, NULL, 'system:monitor:list', '/api/v1/monitor/cache', 'GET') \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&menus).await?;

        let role_menu = format!(
            "INSERT INTO sys_role_menu (tenant_id, role_id, menu_id) VALUES \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 150), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 151), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 160), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 161) \
             ON CONFLICT (role_id, menu_id) DO NOTHING;"
        );
        conn.execute_unprepared(&role_menu).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            "DELETE FROM sys_role_menu WHERE menu_id IN (150,151,160,161); \
             DELETE FROM sys_menu WHERE id IN (150,151,160,161);",
        )
        .await?;
        Ok(())
    }
}
