use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP_SQL: &str = r#"
UPDATE sys_menu SET path = '/users', icon = 'Users' WHERE perm = 'system:user:list';
UPDATE sys_menu SET path = '/roles', icon = 'ShieldCheck' WHERE perm = 'system:role:list';
UPDATE sys_menu SET path = '/menus', icon = 'FolderTree' WHERE perm = 'system:menu:list';
UPDATE sys_menu SET path = '/depts', icon = 'Network' WHERE perm = 'system:dept:list';
UPDATE sys_menu SET path = '/logs', icon = 'ScrollText' WHERE perm = 'system:log:list';
UPDATE sys_menu SET path = '/tenants', icon = 'Building2' WHERE perm = 'platform:tenant:list';
UPDATE sys_menu SET path = '/settings', icon = 'Settings' WHERE perm = 'system:config:list';
UPDATE sys_menu SET path = '/dict', icon = 'BookOpen' WHERE perm = 'system:dict:list';
UPDATE sys_menu SET path = '/posts', icon = 'BriefcaseBusiness' WHERE perm = 'system:post:list';
UPDATE sys_menu SET path = '/params', icon = 'SlidersHorizontal' WHERE perm = 'system:param:list';
UPDATE sys_menu SET path = '/notices', icon = 'Bell' WHERE perm = 'system:notice:list';
UPDATE sys_menu SET path = '/messages', icon = 'MessageSquare' WHERE perm = 'system:message:list';
UPDATE sys_menu SET path = '/jobs', icon = 'CalendarClock' WHERE perm = 'system:job:list';
UPDATE sys_menu SET path = '/gen', icon = 'Code2' WHERE perm = 'system:gen:list';
UPDATE sys_menu SET path = '/files', icon = 'Archive' WHERE perm = 'system:file:list';
UPDATE sys_menu SET path = '/online', icon = 'Monitor' WHERE perm = 'system:online:list';
UPDATE sys_menu SET path = '/monitor', icon = 'Activity' WHERE perm = 'system:monitor:list';
"#;

const DOWN_SQL: &str = r#"
UPDATE sys_menu SET path = '/system/user' WHERE perm = 'system:user:list';
UPDATE sys_menu SET path = '/system/role' WHERE perm = 'system:role:list';
UPDATE sys_menu SET path = '/system/menu' WHERE perm = 'system:menu:list';
UPDATE sys_menu SET path = '/system/dept' WHERE perm = 'system:dept:list';
UPDATE sys_menu SET path = '/system/log' WHERE perm = 'system:log:list';
UPDATE sys_menu SET path = '/platform/tenant' WHERE perm = 'platform:tenant:list';
UPDATE sys_menu SET path = '/system/config' WHERE perm = 'system:config:list';
UPDATE sys_menu SET path = '/system/dict' WHERE perm = 'system:dict:list';
UPDATE sys_menu SET path = '/system/post' WHERE perm = 'system:post:list';
UPDATE sys_menu SET path = '/system/param' WHERE perm = 'system:param:list';
UPDATE sys_menu SET path = '/system/notice' WHERE perm = 'system:notice:list';
UPDATE sys_menu SET path = '/system/message' WHERE perm = 'system:message:list';
UPDATE sys_menu SET path = '/system/job' WHERE perm = 'system:job:list';
UPDATE sys_menu SET path = '/tool/gen' WHERE perm = 'system:gen:list';
UPDATE sys_menu SET path = '/tool/file' WHERE perm = 'system:file:list';
UPDATE sys_menu SET path = '/monitor/online' WHERE perm = 'system:online:list';
UPDATE sys_menu SET path = '/monitor/server' WHERE perm = 'system:monitor:list';
"#;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(UP_SQL).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(DOWN_SQL)
            .await?;
        Ok(())
    }
}
