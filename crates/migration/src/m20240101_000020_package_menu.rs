use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const PLATFORM_TENANT_ID: i64 = 0;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(&format!(
            "INSERT INTO sys_menu \
             (id, tenant_id, parent_id, name, type, path, component, perm, api_path, api_method, icon, sort) VALUES \
             (170, {PLATFORM_TENANT_ID}, 0, '套餐管理', 2, '/packages', 'platform/package/index', 'platform:package:list', '/api/v1/platform/packages', 'GET', 'Boxes', 35), \
             (171, {PLATFORM_TENANT_ID}, 170, '套餐新增', 3, NULL, NULL, 'platform:package:create', '/api/v1/platform/packages', 'POST', NULL, 0), \
             (172, {PLATFORM_TENANT_ID}, 170, '套餐修改', 3, NULL, NULL, 'platform:package:update', '/api/v1/platform/packages/:id', 'PUT', NULL, 0), \
             (173, {PLATFORM_TENANT_ID}, 170, '套餐删除', 3, NULL, NULL, 'platform:package:delete', '/api/v1/platform/packages/:id', 'DELETE', NULL, 0), \
             (174, {PLATFORM_TENANT_ID}, 170, '功能列表', 3, NULL, NULL, 'platform:feature:list', '/api/v1/platform/features', 'GET', NULL, 0) \
             ON CONFLICT (id) DO NOTHING; \
             INSERT INTO sys_role_menu (tenant_id, role_id, menu_id) \
             SELECT r.tenant_id, r.id, m.id \
             FROM sys_role r \
             JOIN sys_menu m ON m.id IN (170,171,172,173,174) \
             WHERE r.tenant_id = {PLATFORM_TENANT_ID} \
             ON CONFLICT (role_id, menu_id) DO NOTHING;"
        )).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                "DELETE FROM sys_role_menu WHERE menu_id IN (170,171,172,173,174); \
                 DELETE FROM sys_menu WHERE id IN (170,171,172,173,174);",
            )
            .await?;
        Ok(())
    }
}
