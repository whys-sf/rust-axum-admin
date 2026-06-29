use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP_SQL: &str = r#"
ALTER TABLE sys_config ADD COLUMN IF NOT EXISTS tenant_id BIGINT NOT NULL DEFAULT 0;
ALTER TABLE sys_config DROP CONSTRAINT IF EXISTS sys_config_pkey;
ALTER TABLE sys_config ADD PRIMARY KEY (tenant_id, config_key);
CREATE INDEX IF NOT EXISTS idx_config_tenant ON sys_config (tenant_id);
"#;

const DOWN_SQL: &str = r#"
DELETE FROM sys_config WHERE tenant_id <> 0;
ALTER TABLE sys_config DROP CONSTRAINT IF EXISTS sys_config_pkey;
DROP INDEX IF EXISTS idx_config_tenant;
ALTER TABLE sys_config ADD PRIMARY KEY (config_key);
ALTER TABLE sys_config DROP COLUMN IF EXISTS tenant_id;
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
