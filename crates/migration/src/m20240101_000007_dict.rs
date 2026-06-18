use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

// Reserved ids (mirror of the seed migration).
const PLATFORM_TENANT_ID: i64 = 0;
const DEMO_TENANT_ID: i64 = 1000;
const DEMO_ADMIN_ROLE_ID: i64 = 1001;

// Demo dictionary ids (kept away from snowflake ids, which are far larger).
const DT_USER_STATUS: i64 = 1300;
const DT_REGION: i64 = 1301;

const UP_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS sys_dict_type (
    id         BIGINT       PRIMARY KEY,
    tenant_id  BIGINT       NOT NULL,
    code       VARCHAR(64)  NOT NULL,
    name       VARCHAR(128) NOT NULL,
    is_tree    BOOLEAN      NOT NULL DEFAULT false,
    status     SMALLINT     NOT NULL DEFAULT 1,
    remark     VARCHAR(255),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_dict_type_code ON sys_dict_type (tenant_id, code);

CREATE TABLE IF NOT EXISTS sys_dict_item (
    id         BIGINT       PRIMARY KEY,
    tenant_id  BIGINT       NOT NULL,
    dict_code  VARCHAR(64)  NOT NULL,
    parent_id  BIGINT       NOT NULL DEFAULT 0,
    label      VARCHAR(128) NOT NULL,
    value      VARCHAR(128) NOT NULL,
    sort       INT          NOT NULL DEFAULT 0,
    status     SMALLINT     NOT NULL DEFAULT 1,
    css_class  VARCHAR(64),
    list_class VARCHAR(64),
    remark     VARCHAR(255),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dict_item_code ON sys_dict_item (tenant_id, dict_code);
CREATE INDEX IF NOT EXISTS idx_dict_item_parent ON sys_dict_item (parent_id);
"#;

const DOWN_SQL: &str = "DROP TABLE IF EXISTS sys_dict_item; DROP TABLE IF EXISTS sys_dict_type;";

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(UP_SQL).await?;

        // seed one flat and one tree dictionary for the demo tenant.
        let types = format!(
            "INSERT INTO sys_dict_type (id, tenant_id, code, name, is_tree, remark) VALUES \
             ({DT_USER_STATUS}, {DEMO_TENANT_ID}, 'sys_user_status', '用户状态', false, '非树形示例'), \
             ({DT_REGION}, {DEMO_TENANT_ID}, 'sys_region', '行政区划', true, '树形示例') \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&types).await?;

        let items = format!(
            "INSERT INTO sys_dict_item \
             (id, tenant_id, dict_code, parent_id, label, value, sort, list_class) VALUES \
             (1310, {DEMO_TENANT_ID}, 'sys_user_status', 0, '正常', '1', 0, 'success'), \
             (1311, {DEMO_TENANT_ID}, 'sys_user_status', 0, '停用', '0', 1, 'danger'), \
             (1320, {DEMO_TENANT_ID}, 'sys_region', 0, '广东省', '440000', 0, NULL), \
             (1321, {DEMO_TENANT_ID}, 'sys_region', 1320, '广州市', '440100', 0, NULL), \
             (1322, {DEMO_TENANT_ID}, 'sys_region', 1320, '深圳市', '440300', 1, NULL), \
             (1323, {DEMO_TENANT_ID}, 'sys_region', 0, '浙江省', '330000', 1, NULL), \
             (1324, {DEMO_TENANT_ID}, 'sys_region', 1323, '杭州市', '330100', 0, NULL) \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&items).await?;

        // "字典管理" menu (list) + create/update/delete buttons. The casbin
        // policies use keyMatch2, so `/api/v1/dicts/*` covers every sub-path
        // (types, items, code lookup) for the matching HTTP method.
        let menus = format!(
            "INSERT INTO sys_menu \
             (id, tenant_id, parent_id, name, type, path, component, perm, api_path, api_method) VALUES \
             (70, {PLATFORM_TENANT_ID}, 1, '字典管理', 2, '/system/dict', 'system/dict/index', 'system:dict:list', '/api/v1/dicts/*', 'GET'), \
             (71, {PLATFORM_TENANT_ID}, 70, '字典新增', 3, NULL, NULL, 'system:dict:create', '/api/v1/dicts/*', 'POST'), \
             (72, {PLATFORM_TENANT_ID}, 70, '字典修改', 3, NULL, NULL, 'system:dict:update', '/api/v1/dicts/*', 'PUT'), \
             (73, {PLATFORM_TENANT_ID}, 70, '字典删除', 3, NULL, NULL, 'system:dict:delete', '/api/v1/dicts/*', 'DELETE') \
             ON CONFLICT (id) DO NOTHING;"
        );
        conn.execute_unprepared(&menus).await?;

        // grant the new menus to the demo tenant admin so the feature is usable
        // out of the box (mirrors how other module menus are seeded).
        let role_menu = format!(
            "INSERT INTO sys_role_menu (tenant_id, role_id, menu_id) VALUES \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 70), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 71), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 72), \
             ({DEMO_TENANT_ID}, {DEMO_ADMIN_ROLE_ID}, 73) \
             ON CONFLICT (role_id, menu_id) DO NOTHING;"
        );
        conn.execute_unprepared(&role_menu).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("DELETE FROM sys_role_menu WHERE menu_id IN (70, 71, 72, 73);")
            .await?;
        conn.execute_unprepared("DELETE FROM sys_menu WHERE id IN (70, 71, 72, 73);")
            .await?;
        conn.execute_unprepared(DOWN_SQL).await?;
        Ok(())
    }
}
