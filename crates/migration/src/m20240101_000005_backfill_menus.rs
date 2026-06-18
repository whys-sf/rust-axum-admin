use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

// Reserved ids (mirror of the seed migration).
const PLATFORM_TENANT_ID: i64 = 0;
const DEMO_TENANT_ID: i64 = 1000;
const DEMO_ADMIN_ROLE_ID: i64 = 1001;

/// Backfill the dept (50-53) and data-scope (15) menus into the platform menu
/// pool, then re-grant every platform menu to the demo admin role.
///
/// These menus were added to the seed function after the original seed
/// migration had already run, so databases migrated incrementally never got
/// them. Fresh databases already have them; this makes existing ones match.
#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        let menus = format!(
            "INSERT INTO sys_menu \
             (id, tenant_id, parent_id, name, type, path, component, perm, api_path, api_method) VALUES \
             (15, {PLATFORM_TENANT_ID}, 10, '分配数据范围', 3, NULL, NULL, 'system:role:datascope', '/api/v1/roles/:id/depts', 'PUT'), \
             (50, {PLATFORM_TENANT_ID}, 1, '部门管理', 2, '/system/dept', 'system/dept/index', 'system:dept:list', '/api/v1/depts', 'GET'), \
             (51, {PLATFORM_TENANT_ID}, 50, '部门新增', 3, NULL, NULL, 'system:dept:create', '/api/v1/depts', 'POST'), \
             (52, {PLATFORM_TENANT_ID}, 50, '部门修改', 3, NULL, NULL, 'system:dept:update', '/api/v1/depts/:id', 'PUT'), \
             (53, {PLATFORM_TENANT_ID}, 50, '部门删除', 3, NULL, NULL, 'system:dept:delete', '/api/v1/depts/:id', 'DELETE') \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&menus).await?;

        let role_menu = format!(
            "INSERT INTO sys_role_menu (tenant_id, role_id, menu_id) \
             SELECT {DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, id FROM sys_menu WHERE tenant_id = {PLATFORM_TENANT_ID} \
             ON CONFLICT (role_id, menu_id) DO NOTHING;"
        );
        conn.execute_unprepared(&role_menu).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("DELETE FROM sys_role_menu WHERE menu_id IN (15, 50, 51, 52, 53);")
            .await?;
        conn.execute_unprepared("DELETE FROM sys_menu WHERE id IN (15, 50, 51, 52, 53);")
            .await?;
        Ok(())
    }
}
