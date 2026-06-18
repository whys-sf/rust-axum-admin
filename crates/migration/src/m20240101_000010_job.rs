use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const PLATFORM_TENANT_ID: i64 = 0;
const DEMO_TENANT_ID: i64 = 1000;
const DEMO_ADMIN_ROLE_ID: i64 = 1001;

const UP_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS sys_job (
    id            BIGINT       PRIMARY KEY,
    tenant_id     BIGINT       NOT NULL,
    name          VARCHAR(128) NOT NULL,
    job_group     VARCHAR(64)  NOT NULL DEFAULT 'default',
    invoke_target VARCHAR(128) NOT NULL,
    cron_expr     VARCHAR(64)  NOT NULL,
    status        SMALLINT     NOT NULL DEFAULT 0,
    remark        VARCHAR(255),
    last_run_at   TIMESTAMPTZ,
    next_run_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_tenant ON sys_job (tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_due ON sys_job (status, next_run_at);

CREATE TABLE IF NOT EXISTS sys_job_log (
    id            BIGINT       PRIMARY KEY,
    tenant_id     BIGINT       NOT NULL,
    job_id        BIGINT       NOT NULL,
    job_name      VARCHAR(128) NOT NULL,
    invoke_target VARCHAR(128) NOT NULL,
    status        SMALLINT     NOT NULL,
    message       TEXT         NOT NULL DEFAULT '',
    started_at    TIMESTAMPTZ  NOT NULL,
    duration_ms   BIGINT       NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_log_job ON sys_job_log (tenant_id, job_id);
"#;

const DOWN_SQL: &str = "DROP TABLE IF EXISTS sys_job_log; DROP TABLE IF EXISTS sys_job;";

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(UP_SQL).await?;

        // a demo job (paused by default so it never fires unexpectedly in CI).
        let seed = format!(
            "INSERT INTO sys_job (id, tenant_id, name, invoke_target, cron_expr, status, remark) VALUES \
             (1440, {DEMO_TENANT_ID}, '示例心跳任务', 'demo:heartbeat', '0 0/1 * * * *', 0, '每分钟执行一次的示例任务（默认暂停）') \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&seed).await?;

        let menus = format!(
            "INSERT INTO sys_menu \
             (id, tenant_id, parent_id, name, type, path, component, perm, api_path, api_method) VALUES \
             (120, {PLATFORM_TENANT_ID}, 1, '定时任务', 2, '/system/job', 'system/job/index', 'system:job:list', '/api/v1/jobs', 'GET'), \
             (121, {PLATFORM_TENANT_ID}, 120, '任务新增', 3, NULL, NULL, 'system:job:create', '/api/v1/jobs', 'POST'), \
             (122, {PLATFORM_TENANT_ID}, 120, '任务修改', 3, NULL, NULL, 'system:job:update', '/api/v1/jobs/:id', 'PUT'), \
             (123, {PLATFORM_TENANT_ID}, 120, '任务删除', 3, NULL, NULL, 'system:job:delete', '/api/v1/jobs/:id', 'DELETE'), \
             (124, {PLATFORM_TENANT_ID}, 120, '任务执行', 3, NULL, NULL, 'system:job:run', '/api/v1/jobs/:id/run', 'POST'), \
             (125, {PLATFORM_TENANT_ID}, 120, '任务状态', 3, NULL, NULL, 'system:job:update', '/api/v1/jobs/:id/status', 'PUT'), \
             (126, {PLATFORM_TENANT_ID}, 120, '日志查看', 3, NULL, NULL, 'system:job:list', '/api/v1/job-logs', 'GET') \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&menus).await?;

        let role_menu = format!(
            "INSERT INTO sys_role_menu (tenant_id, role_id, menu_id) VALUES \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 120), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 121), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 122), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 123), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 124), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 125), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 126) \
             ON CONFLICT (role_id, menu_id) DO NOTHING;"
        );
        conn.execute_unprepared(&role_menu).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            "DELETE FROM sys_role_menu WHERE menu_id IN (120,121,122,123,124,125,126); \
             DELETE FROM sys_menu WHERE id IN (120,121,122,123,124,125,126);",
        )
        .await?;
        conn.execute_unprepared(DOWN_SQL).await?;
        Ok(())
    }
}
