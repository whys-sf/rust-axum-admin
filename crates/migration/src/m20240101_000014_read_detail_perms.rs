use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const PLATFORM_TENANT_ID: i64 = 0;
const DEMO_TENANT_ID: i64 = 1000;
const DEMO_ADMIN_ROLE_ID: i64 = 1001;

// New menu ids reserved for the detail-read permissions (200..=207).
const NEW_MENU_IDS: &str = "(200, 201, 202, 203, 204, 205, 206, 207)";

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    /// The early modules (user/role/menu/dept/post/param/notice/job) only
    /// seeded list/create/update/delete permissions and used exact `:id` API
    /// paths, so the `GET /<res>/:id` detail endpoints (and the role's
    /// `GET /roles/:id/menus|depts` sub-resources) had no matching casbin
    /// policy. Tenant admins therefore hit 403 whenever the UI opened a detail
    /// view — most visibly the "分配角色" dialog, which fetches
    /// `GET /users/:id` to read the user's current roles.
    ///
    /// Newer modules (dict/gen) avoid this by granting a wildcard read path.
    /// This migration applies the same convention: one hidden button menu per
    /// resource granting `GET /api/v1/<res>/*` under the existing `:list`
    /// permission. `keyMatch2` expands `/*` to `/.*`, so a single GET rule
    /// covers every read sub-path without widening write access.
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        let menus = format!(
            "INSERT INTO sys_menu \
             (id, tenant_id, parent_id, name, type, path, component, perm, api_path, api_method) VALUES \
             (200, {PLATFORM_TENANT_ID}, 2,  '用户详情', 3, NULL, NULL, 'system:user:list',   '/api/v1/users/*',   'GET'), \
             (201, {PLATFORM_TENANT_ID}, 10, '角色详情', 3, NULL, NULL, 'system:role:list',   '/api/v1/roles/*',   'GET'), \
             (202, {PLATFORM_TENANT_ID}, 20, '菜单详情', 3, NULL, NULL, 'system:menu:list',   '/api/v1/menus/*',   'GET'), \
             (203, {PLATFORM_TENANT_ID}, 50, '部门详情', 3, NULL, NULL, 'system:dept:list',   '/api/v1/depts/*',   'GET'), \
             (204, {PLATFORM_TENANT_ID}, 80, '岗位详情', 3, NULL, NULL, 'system:post:list',   '/api/v1/posts/*',   'GET'), \
             (205, {PLATFORM_TENANT_ID}, 90, '参数详情', 3, NULL, NULL, 'system:param:list',  '/api/v1/params/*',  'GET'), \
             (206, {PLATFORM_TENANT_ID}, 100,'公告详情', 3, NULL, NULL, 'system:notice:list', '/api/v1/notices/*', 'GET'), \
             (207, {PLATFORM_TENANT_ID}, 120,'任务详情', 3, NULL, NULL, 'system:job:list',    '/api/v1/jobs/*',    'GET') \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&menus).await?;

        // Grant the new menus to the demo tenant admin (existing tenants do not
        // re-inherit platform menus automatically). Newly created tenants pick
        // these up via the normal "copy all platform menus" path.
        let role_menu = format!(
            "INSERT INTO sys_role_menu (tenant_id, role_id, menu_id) VALUES \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 200), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 201), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 202), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 203), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 204), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 205), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 206), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 207) \
             ON CONFLICT (role_id, menu_id) DO NOTHING;"
        );
        conn.execute_unprepared(&role_menu).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(&format!(
            "DELETE FROM sys_role_menu WHERE menu_id IN {NEW_MENU_IDS}; \
             DELETE FROM sys_menu WHERE id IN {NEW_MENU_IDS};"
        ))
        .await?;
        Ok(())
    }
}
