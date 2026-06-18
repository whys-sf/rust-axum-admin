use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS sys_role_dept (
    tenant_id BIGINT NOT NULL,
    role_id   BIGINT NOT NULL,
    dept_id   BIGINT NOT NULL,
    PRIMARY KEY (role_id, dept_id)
);
CREATE INDEX IF NOT EXISTS idx_role_dept_tenant ON sys_role_dept (tenant_id);
"#;

const DOWN_SQL: &str = "DROP TABLE IF EXISTS sys_role_dept;";

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
