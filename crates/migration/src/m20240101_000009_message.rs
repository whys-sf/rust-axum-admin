use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const PLATFORM_TENANT_ID: i64 = 0;
const DEMO_TENANT_ID: i64 = 1000;
const DEMO_ADMIN_ROLE_ID: i64 = 1001;
const DEMO_ADMIN_USER_ID: i64 = 1002;

const UP_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS sys_message (
    id         BIGINT       PRIMARY KEY,
    tenant_id  BIGINT       NOT NULL,
    sender_id  BIGINT,
    title      VARCHAR(255) NOT NULL,
    content    TEXT         NOT NULL DEFAULT '',
    msg_type   SMALLINT     NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_message_tenant ON sys_message (tenant_id);

CREATE TABLE IF NOT EXISTS sys_message_receiver (
    id          BIGINT      PRIMARY KEY,
    tenant_id   BIGINT      NOT NULL,
    message_id  BIGINT      NOT NULL,
    receiver_id BIGINT      NOT NULL,
    is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_message_receiver ON sys_message_receiver (message_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_message_receiver_inbox ON sys_message_receiver (receiver_id, is_read);
"#;

const DOWN_SQL: &str =
    "DROP TABLE IF EXISTS sys_message_receiver; DROP TABLE IF EXISTS sys_message;";

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(UP_SQL).await?;

        // a welcome message in the demo admin's inbox.
        let seed = format!(
            "INSERT INTO sys_message (id, tenant_id, sender_id, title, content, msg_type) VALUES \
             (1430, {DEMO_TENANT_ID}, NULL, '欢迎使用消息中心', '这是一条系统消息示例，您可以在此查看站内信。', 1) \
             ON CONFLICT (id) DO NOTHING; \
             INSERT INTO sys_message_receiver (id, tenant_id, message_id, receiver_id, is_read) VALUES \
             (1431, {DEMO_TENANT_ID}, 1430, {DEMO_ADMIN_USER_ID}, FALSE) \
             ON CONFLICT (message_id, receiver_id) DO NOTHING;"
        );
        conn.execute_unprepared(&seed).await?;

        // admin "消息管理" menu (sending + managing). The personal inbox endpoints
        // are identity-gated (no permission needed), so only the admin surface is
        // listed here.
        let menus = format!(
            "INSERT INTO sys_menu \
             (id, tenant_id, parent_id, name, type, path, component, perm, api_path, api_method) VALUES \
             (110, {PLATFORM_TENANT_ID}, 1, '消息管理', 2, '/system/message', 'system/message/index', 'system:message:list', '/api/v1/messages', 'GET'), \
             (111, {PLATFORM_TENANT_ID}, 110, '消息发送', 3, NULL, NULL, 'system:message:create', '/api/v1/messages', 'POST'), \
             (112, {PLATFORM_TENANT_ID}, 110, '消息删除', 3, NULL, NULL, 'system:message:delete', '/api/v1/messages/:id', 'DELETE') \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&menus).await?;

        let role_menu = format!(
            "INSERT INTO sys_role_menu (tenant_id, role_id, menu_id) VALUES \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 110), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 111), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 112) \
             ON CONFLICT (role_id, menu_id) DO NOTHING;"
        );
        conn.execute_unprepared(&role_menu).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            "DELETE FROM sys_role_menu WHERE menu_id IN (110,111,112); \
             DELETE FROM sys_menu WHERE id IN (110,111,112);",
        )
        .await?;
        conn.execute_unprepared(DOWN_SQL).await?;
        Ok(())
    }
}
