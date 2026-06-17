use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{PasswordHasher, SaltString};
use argon2::Argon2;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

/// Default password for the seeded admin accounts. Change on first login.
const DEFAULT_PASSWORD: &str = "Admin@123456";

// Reserved ids.
const PLATFORM_TENANT_ID: i64 = 0;
const SUPERADMIN_USER_ID: i64 = 1;
const DEMO_TENANT_ID: i64 = 1000;
const DEMO_ADMIN_ROLE_ID: i64 = 1001;
const DEMO_ADMIN_USER_ID: i64 = 1002;

fn hash_password(pwd: &str) -> String {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(pwd.as_bytes(), &salt)
        .expect("hash default password")
        .to_string()
}

/// (id, parent_id, name, type, path, component, perm, api_path, api_method)
type MenuSeed = (
    i64,
    i64,
    &'static str,
    i16,
    &'static str,
    &'static str,
    &'static str,
    &'static str,
    &'static str,
);

fn platform_menus() -> Vec<MenuSeed> {
    vec![
        (1, 0, "系统管理", 1, "/system", "", "", "", ""),
        (
            2,
            1,
            "用户管理",
            2,
            "/system/user",
            "system/user/index",
            "system:user:list",
            "/api/v1/users",
            "GET",
        ),
        (
            3,
            2,
            "用户新增",
            3,
            "",
            "",
            "system:user:create",
            "/api/v1/users",
            "POST",
        ),
        (
            4,
            2,
            "用户修改",
            3,
            "",
            "",
            "system:user:update",
            "/api/v1/users/:id",
            "PUT",
        ),
        (
            5,
            2,
            "用户删除",
            3,
            "",
            "",
            "system:user:delete",
            "/api/v1/users/:id",
            "DELETE",
        ),
        (
            6,
            2,
            "分配角色",
            3,
            "",
            "",
            "system:user:assign",
            "/api/v1/users/:id/roles",
            "PUT",
        ),
        (
            10,
            1,
            "角色管理",
            2,
            "/system/role",
            "system/role/index",
            "system:role:list",
            "/api/v1/roles",
            "GET",
        ),
        (
            11,
            10,
            "角色新增",
            3,
            "",
            "",
            "system:role:create",
            "/api/v1/roles",
            "POST",
        ),
        (
            12,
            10,
            "角色修改",
            3,
            "",
            "",
            "system:role:update",
            "/api/v1/roles/:id",
            "PUT",
        ),
        (
            13,
            10,
            "角色删除",
            3,
            "",
            "",
            "system:role:delete",
            "/api/v1/roles/:id",
            "DELETE",
        ),
        (
            14,
            10,
            "分配菜单",
            3,
            "",
            "",
            "system:role:assign",
            "/api/v1/roles/:id/menus",
            "PUT",
        ),
        (
            20,
            1,
            "菜单管理",
            2,
            "/system/menu",
            "system/menu/index",
            "system:menu:list",
            "/api/v1/menus",
            "GET",
        ),
        (
            21,
            20,
            "菜单新增",
            3,
            "",
            "",
            "system:menu:create",
            "/api/v1/menus",
            "POST",
        ),
        (
            22,
            20,
            "菜单修改",
            3,
            "",
            "",
            "system:menu:update",
            "/api/v1/menus/:id",
            "PUT",
        ),
        (
            23,
            20,
            "菜单删除",
            3,
            "",
            "",
            "system:menu:delete",
            "/api/v1/menus/:id",
            "DELETE",
        ),
        (
            50,
            1,
            "部门管理",
            2,
            "/system/dept",
            "system/dept/index",
            "system:dept:list",
            "/api/v1/depts",
            "GET",
        ),
        (
            51,
            50,
            "部门新增",
            3,
            "",
            "",
            "system:dept:create",
            "/api/v1/depts",
            "POST",
        ),
        (
            52,
            50,
            "部门修改",
            3,
            "",
            "",
            "system:dept:update",
            "/api/v1/depts/:id",
            "PUT",
        ),
        (
            53,
            50,
            "部门删除",
            3,
            "",
            "",
            "system:dept:delete",
            "/api/v1/depts/:id",
            "DELETE",
        ),
        (
            30,
            1,
            "操作日志",
            2,
            "/system/log",
            "system/log/index",
            "system:log:list",
            "/api/v1/logs",
            "GET",
        ),
        (
            40,
            0,
            "租户管理",
            2,
            "/platform/tenant",
            "platform/tenant/index",
            "platform:tenant:list",
            "/api/v1/platform/tenants",
            "GET",
        ),
    ]
}

fn sql_str(v: &str) -> String {
    if v.is_empty() {
        "NULL".to_string()
    } else {
        format!("'{}'", v.replace('\'', "''"))
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        let pwd = hash_password(DEFAULT_PASSWORD);

        // 1. platform tenant + demo tenant
        let tenants = format!(
            "INSERT INTO sys_tenant (id, name, code, status, user_limit) VALUES \
             ({PLATFORM_TENANT_ID}, '平台', 'platform', 1, 0), \
             ({DEMO_TENANT_ID}, '演示租户', 'demo', 1, 50) \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&tenants).await?;

        // 2. platform super admin (tenant 0)
        let superadmin = format!(
            "INSERT INTO sys_user (id, tenant_id, username, password, nickname, status) VALUES \
             ({SUPERADMIN_USER_ID}, {PLATFORM_TENANT_ID}, 'superadmin', {}, '平台超级管理员', 1) \
             ON CONFLICT (id) DO NOTHING;",
            sql_str(&pwd)
        );
        conn.execute_unprepared(&superadmin).await?;

        // 3. platform menu pool (tenant 0)
        let mut menu_values = Vec::new();
        for (id, parent, name, ty, path, component, perm, api_path, api_method) in platform_menus()
        {
            menu_values.push(format!(
                "({id}, {PLATFORM_TENANT_ID}, {parent}, {}, {ty}, {}, {}, {}, {}, {})",
                sql_str(name),
                sql_str(path),
                sql_str(component),
                sql_str(perm),
                sql_str(api_path),
                sql_str(api_method),
            ));
        }
        let menus = format!(
            "INSERT INTO sys_menu (id, tenant_id, parent_id, name, type, path, component, perm, api_path, api_method) \
             VALUES {} ON CONFLICT (id) DO NOTHING;",
            menu_values.join(", ")
        );
        conn.execute_unprepared(&menus).await?;

        // 4. demo tenant admin role + admin user + bindings
        let demo_role = format!(
            "INSERT INTO sys_role (id, tenant_id, name, code, status, data_scope) VALUES \
             ({DEMO_ADMIN_ROLE_ID}, {DEMO_TENANT_ID}, '租户管理员', 'admin', 1, 1) \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&demo_role).await?;

        let demo_user = format!(
            "INSERT INTO sys_user (id, tenant_id, username, password, nickname, status) VALUES \
             ({DEMO_ADMIN_USER_ID}, {DEMO_TENANT_ID}, 'admin', {}, '演示租户管理员', 1) \
             ON CONFLICT (id) DO NOTHING;",
            sql_str(&pwd)
        );
        conn.execute_unprepared(&demo_user).await?;

        let user_role = format!(
            "INSERT INTO sys_user_role (tenant_id, user_id, role_id) VALUES \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_USER_ID}, {DEMO_ADMIN_ROLE_ID}) \
             ON CONFLICT (user_id, role_id) DO NOTHING;"
        );
        conn.execute_unprepared(&user_role).await?;

        // assign all platform menus to the demo admin role
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
        for sql in [
            "DELETE FROM sys_role_menu;",
            "DELETE FROM sys_user_role;",
            "DELETE FROM sys_menu;",
            "DELETE FROM sys_role;",
            "DELETE FROM sys_user;",
            "DELETE FROM sys_tenant;",
        ] {
            conn.execute_unprepared(sql).await?;
        }
        Ok(())
    }
}
