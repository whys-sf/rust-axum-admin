use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const PLATFORM_TENANT_ID: i64 = 0;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    /// Grant every platform menu to every platform-tenant role. Platform-tenant
    /// roles are super-admin roles, so they should always hold the full menu
    /// pool. This backfills roles created before this convention existed; new
    /// menus stay in sync via `create_menu` (which auto-grants to platform
    /// roles).
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(&format!(
            "INSERT INTO sys_role_menu (tenant_id, role_id, menu_id) \
             SELECT r.tenant_id, r.id, m.id \
             FROM sys_role r \
             JOIN sys_menu m ON m.tenant_id = {PLATFORM_TENANT_ID} \
             WHERE r.tenant_id = {PLATFORM_TENANT_ID} \
             ON CONFLICT (role_id, menu_id) DO NOTHING;"
        ))
        .await?;
        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // The grants are indistinguishable from manually-assigned ones, so this
        // migration is intentionally not reversible.
        Ok(())
    }
}
