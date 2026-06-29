use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS sys_tenant (
    id            BIGINT       PRIMARY KEY,
    name          VARCHAR(128) NOT NULL,
    code          VARCHAR(64)  NOT NULL,
    contact_name  VARCHAR(64),
    contact_phone VARCHAR(32),
    domain        VARCHAR(128),
    package_id    BIGINT,
    user_limit    INT          NOT NULL DEFAULT 0,
    status        SMALLINT     NOT NULL DEFAULT 1,
    expire_at     TIMESTAMPTZ,
    remark        VARCHAR(255),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_tenant_code ON sys_tenant (code);

CREATE TABLE IF NOT EXISTS sys_user (
    id            BIGINT       PRIMARY KEY,
    tenant_id     BIGINT       NOT NULL,
    username      VARCHAR(64)  NOT NULL,
    password      VARCHAR(255) NOT NULL,
    nickname      VARCHAR(64),
    email         VARCHAR(128),
    phone         VARCHAR(32),
    avatar        VARCHAR(255),
    gender        SMALLINT     NOT NULL DEFAULT 0,
    status        SMALLINT     NOT NULL DEFAULT 1,
    dept_id       BIGINT,
    remark        VARCHAR(255),
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(64),
    created_by    BIGINT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_user_tenant_username ON sys_user (tenant_id, username);
CREATE INDEX IF NOT EXISTS idx_user_tenant ON sys_user (tenant_id);

CREATE TABLE IF NOT EXISTS sys_role (
    id          BIGINT      PRIMARY KEY,
    tenant_id   BIGINT      NOT NULL,
    name        VARCHAR(64) NOT NULL,
    code        VARCHAR(64) NOT NULL,
    sort        INT         NOT NULL DEFAULT 0,
    status      SMALLINT    NOT NULL DEFAULT 1,
    data_scope  SMALLINT    NOT NULL DEFAULT 1,
    remark      VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_role_tenant_code ON sys_role (tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_role_tenant ON sys_role (tenant_id);

CREATE TABLE IF NOT EXISTS sys_menu (
    id          BIGINT       PRIMARY KEY,
    tenant_id   BIGINT       NOT NULL DEFAULT 0,
    parent_id   BIGINT       NOT NULL DEFAULT 0,
    name        VARCHAR(64)  NOT NULL,
    type        SMALLINT     NOT NULL,
    path        VARCHAR(255),
    component   VARCHAR(255),
    perm        VARCHAR(128),
    api_path    VARCHAR(255),
    api_method  VARCHAR(16),
    icon        VARCHAR(64),
    sort        INT          NOT NULL DEFAULT 0,
    visible     SMALLINT     NOT NULL DEFAULT 1,
    status      SMALLINT     NOT NULL DEFAULT 1,
    is_cache    SMALLINT     NOT NULL DEFAULT 0,
    is_external SMALLINT     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_menu_tenant ON sys_menu (tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_parent ON sys_menu (parent_id);

CREATE TABLE IF NOT EXISTS sys_user_role (
    tenant_id BIGINT NOT NULL,
    user_id   BIGINT NOT NULL,
    role_id   BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_user_role_tenant ON sys_user_role (tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_role_role ON sys_user_role (role_id);

CREATE TABLE IF NOT EXISTS sys_role_menu (
    tenant_id BIGINT NOT NULL,
    role_id   BIGINT NOT NULL,
    menu_id   BIGINT NOT NULL,
    PRIMARY KEY (role_id, menu_id)
);
CREATE INDEX IF NOT EXISTS idx_role_menu_tenant ON sys_role_menu (tenant_id);

CREATE TABLE IF NOT EXISTS sys_operation_log (
    id           BIGINT      PRIMARY KEY,
    tenant_id    BIGINT,
    user_id      BIGINT,
    username     VARCHAR(64),
    module       VARCHAR(64),
    action       VARCHAR(64),
    method       VARCHAR(16),
    path         VARCHAR(255),
    ip           VARCHAR(64),
    user_agent   VARCHAR(512),
    request_body TEXT,
    status_code  INT,
    duration_ms  BIGINT,
    error_msg    TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oplog_tenant ON sys_operation_log (tenant_id);
CREATE INDEX IF NOT EXISTS idx_oplog_created ON sys_operation_log (created_at);
"#;

const DOWN_SQL: &str = r#"
DROP TABLE IF EXISTS sys_operation_log;
DROP TABLE IF EXISTS sys_role_menu;
DROP TABLE IF EXISTS sys_user_role;
DROP TABLE IF EXISTS sys_menu;
DROP TABLE IF EXISTS sys_role;
DROP TABLE IF EXISTS sys_user;
DROP TABLE IF EXISTS sys_tenant;
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
