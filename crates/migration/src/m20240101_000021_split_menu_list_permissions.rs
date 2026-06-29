use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP_SQL: &str = r#"
WITH source_menus AS (
    SELECT
        id AS parent_id,
        tenant_id,
        name || '查询' AS child_name,
        perm,
        api_path,
        api_method,
        (('x' || substr(md5('list-menu:' || id::text), 1, 15))::bit(60)::bigint) AS child_id
    FROM sys_menu
    WHERE type <> 3
      AND (
          coalesce(perm, '') <> ''
          OR coalesce(api_path, '') <> ''
          OR coalesce(api_method, '') <> ''
      )
),
inserted_menus AS (
    INSERT INTO sys_menu (
        id,
        tenant_id,
        parent_id,
        name,
        type,
        path,
        component,
        perm,
        api_path,
        api_method,
        sort,
        visible,
        status
    )
    SELECT
        child_id,
        tenant_id,
        parent_id,
        child_name,
        3,
        NULL,
        NULL,
        perm,
        api_path,
        api_method,
        -100,
        1,
        1
    FROM source_menus
    ON CONFLICT (id) DO NOTHING
    RETURNING id
),
granted_roles AS (
    INSERT INTO sys_role_menu (tenant_id, role_id, menu_id)
    SELECT rm.tenant_id, rm.role_id, sm.child_id
    FROM sys_role_menu rm
    JOIN source_menus sm ON sm.parent_id = rm.menu_id
    ON CONFLICT (role_id, menu_id) DO NOTHING
    RETURNING menu_id
)
UPDATE sys_menu
SET perm = NULL,
    api_path = NULL,
    api_method = NULL
WHERE id IN (SELECT parent_id FROM source_menus);
"#;

const DOWN_SQL: &str = r#"
WITH source_menus AS (
    SELECT
        parent.id AS parent_id,
        child.id AS child_id,
        child.perm,
        child.api_path,
        child.api_method
    FROM sys_menu parent
    JOIN sys_menu child
      ON child.parent_id = parent.id
     AND child.id = (('x' || substr(md5('list-menu:' || parent.id::text), 1, 15))::bit(60)::bigint)
    WHERE parent.type <> 3
      AND child.type = 3
      AND child.name = parent.name || '查询'
)
UPDATE sys_menu parent
SET perm = sm.perm,
    api_path = sm.api_path,
    api_method = sm.api_method
FROM source_menus sm
WHERE parent.id = sm.parent_id;

WITH source_menus AS (
    SELECT
        parent.id AS parent_id,
        child.id AS child_id
    FROM sys_menu parent
    JOIN sys_menu child
      ON child.parent_id = parent.id
     AND child.id = (('x' || substr(md5('list-menu:' || parent.id::text), 1, 15))::bit(60)::bigint)
    WHERE parent.type <> 3
      AND child.type = 3
      AND child.name = parent.name || '查询'
)
DELETE FROM sys_role_menu
WHERE menu_id IN (SELECT child_id FROM source_menus);

WITH source_menus AS (
    SELECT
        parent.id AS parent_id,
        child.id AS child_id
    FROM sys_menu parent
    JOIN sys_menu child
      ON child.parent_id = parent.id
     AND child.id = (('x' || substr(md5('list-menu:' || parent.id::text), 1, 15))::bit(60)::bigint)
    WHERE parent.type <> 3
      AND child.type = 3
      AND child.name = parent.name || '查询'
)
DELETE FROM sys_menu
WHERE id IN (SELECT child_id FROM source_menus);
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
