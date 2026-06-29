use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS sys_feature (
    id          BIGINT       PRIMARY KEY,
    code        VARCHAR(64)  NOT NULL,
    name        VARCHAR(64)  NOT NULL,
    description VARCHAR(255),
    status      SMALLINT     NOT NULL DEFAULT 1,
    sort        INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_feature_code ON sys_feature (code);

CREATE TABLE IF NOT EXISTS sys_package (
    id                 BIGINT       PRIMARY KEY,
    code               VARCHAR(64)  NOT NULL,
    name               VARCHAR(64)  NOT NULL,
    description        VARCHAR(255),
    status             SMALLINT     NOT NULL DEFAULT 1,
    sort               INT          NOT NULL DEFAULT 0,
    default_user_limit INT          NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_package_code ON sys_package (code);

CREATE TABLE IF NOT EXISTS sys_package_feature (
    package_id   BIGINT      NOT NULL,
    feature_code VARCHAR(64) NOT NULL,
    PRIMARY KEY (package_id, feature_code)
);
CREATE INDEX IF NOT EXISTS idx_package_feature_code ON sys_package_feature (feature_code);

CREATE TABLE IF NOT EXISTS sys_tenant_feature (
    tenant_id    BIGINT      NOT NULL,
    feature_code VARCHAR(64) NOT NULL,
    enabled      BOOLEAN     NOT NULL DEFAULT true,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, feature_code)
);
CREATE INDEX IF NOT EXISTS idx_tenant_feature_code ON sys_tenant_feature (feature_code);

INSERT INTO sys_feature (id, code, name, description, sort) VALUES
    (20001, 'users', '用户管理', '租户内用户账号管理', 10),
    (20002, 'roles', '角色权限', '租户内角色、菜单授权与数据范围', 20),
    (20003, 'menus', '菜单管理', '租户自定义菜单管理', 30),
    (20004, 'depts', '部门管理', '租户组织架构管理', 40),
    (20005, 'dict', '字典管理', '租户业务字典', 50),
    (20006, 'posts', '岗位管理', '租户岗位配置', 60),
    (20007, 'params', '参数配置', '租户业务参数配置', 70),
    (20008, 'notices', '通知公告', '租户通知公告', 80),
    (20009, 'messages', '消息中心', '站内信与未读消息', 90),
    (20010, 'jobs', '定时任务', '租户定时任务', 100),
    (20011, 'gen', '代码生成', '代码生成工具', 110),
    (20012, 'files', '文件管理', '租户附件与文件夹', 120),
    (20013, 'online', '在线用户', '租户在线用户管理', 130),
    (20014, 'monitor', '服务监控', '服务与缓存监控', 140),
    (20015, 'logs', '操作日志', '租户操作日志', 150),
    (20016, 'settings', '系统设置', '平台系统设置', 160)
ON CONFLICT (code) DO NOTHING;

INSERT INTO sys_package (id, code, name, description, sort, default_user_limit) VALUES
    (21001, 'default', '默认套餐', '包含当前后台全部基础功能', 10, 50)
ON CONFLICT (code) DO NOTHING;

INSERT INTO sys_package_feature (package_id, feature_code)
SELECT 21001, code FROM sys_feature
ON CONFLICT (package_id, feature_code) DO NOTHING;
"#;

const DOWN_SQL: &str = r#"
DROP TABLE IF EXISTS sys_tenant_feature;
DROP TABLE IF EXISTS sys_package_feature;
DROP TABLE IF EXISTS sys_package;
DROP TABLE IF EXISTS sys_feature;
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
