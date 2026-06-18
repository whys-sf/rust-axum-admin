use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

// Reserved ids mirrored from the seed migration.
const DEMO_TENANT_ID: i64 = 1000;
const DEMO_ROOT_DEPT_ID: i64 = 1100;
const DEMO_CHILD_DEPT_ID: i64 = 1101;
const DEMO_ADMIN_USER_ID: i64 = 1002;

const UP_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS sys_dept (
    id         BIGINT       PRIMARY KEY,
    tenant_id  BIGINT       NOT NULL,
    parent_id  BIGINT       NOT NULL DEFAULT 0,
    ancestors  VARCHAR(255) NOT NULL DEFAULT '0',
    name       VARCHAR(64)  NOT NULL,
    sort       INT          NOT NULL DEFAULT 0,
    leader     VARCHAR(64),
    phone      VARCHAR(32),
    email      VARCHAR(128),
    status     SMALLINT     NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dept_tenant ON sys_dept (tenant_id);
CREATE INDEX IF NOT EXISTS idx_dept_parent ON sys_dept (parent_id);
"#;

const DOWN_SQL: &str = "DROP TABLE IF EXISTS sys_dept;";

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(UP_SQL).await?;

        // seed a small org tree for the demo tenant so data-scope filtering has
        // something to operate on out of the box.
        let depts = format!(
            "INSERT INTO sys_dept (id, tenant_id, parent_id, ancestors, name, sort) VALUES \
             ({DEMO_ROOT_DEPT_ID}, {DEMO_TENANT_ID}, 0, '0', '演示总公司', 0), \
             ({DEMO_CHILD_DEPT_ID}, {DEMO_TENANT_ID}, {DEMO_ROOT_DEPT_ID}, '0,{DEMO_ROOT_DEPT_ID}', '研发部', 1) \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&depts).await?;

        let assign = format!(
            "UPDATE sys_user SET dept_id = {DEMO_ROOT_DEPT_ID} \
             WHERE id = {DEMO_ADMIN_USER_ID} AND dept_id IS NULL;"
        );
        conn.execute_unprepared(&assign).await?;

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
