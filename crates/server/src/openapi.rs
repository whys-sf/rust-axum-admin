use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};
use utoipa::{Modify, OpenApi};

/// Adds the `bearer` (JWT) security scheme so the Swagger UI "Authorize" button
/// can attach `Authorization: Bearer <token>` to protected endpoints.
struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let components = openapi
            .components
            .get_or_insert_with(utoipa::openapi::Components::default);
        components.add_security_scheme(
            "bearer",
            SecurityScheme::Http(
                HttpBuilder::new()
                    .scheme(HttpAuthScheme::Bearer)
                    .bearer_format("JWT")
                    .build(),
            ),
        );
    }
}

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Rust Axum Admin API",
        version = "0.1.0",
        description = "多租户管理后台后端 API（Axum 0.8 + SeaORM + Casbin）。\n\n\
            所有响应统一封装为 `{ code, message, data }`，下方 `body` 描述的是 `data` 字段的载荷。\n\
            受保护接口需在请求头携带 `Authorization: Bearer <access_token>`（点右上角 Authorize 录入）。\n\
            平台超管可通过 `X-Tenant-Id` 头切换操作的租户。"
    ),
    modifiers(&SecurityAddon),
    tags(
        (name = "auth", description = "认证与当前用户身份"),
        (name = "user", description = "用户管理"),
        (name = "role", description = "角色管理与数据范围"),
        (name = "menu", description = "菜单 / 权限管理"),
        (name = "dept", description = "部门 / 组织架构"),
        (name = "dict", description = "字典管理（树形 / 非树形）"),
        (name = "post", description = "岗位管理"),
        (name = "param", description = "参数配置"),
        (name = "notice", description = "通知公告"),
        (name = "message", description = "消息中心 / 站内信"),
        (name = "job", description = "定时任务调度"),
        (name = "tenant", description = "租户管理（仅平台超管）"),
        (name = "log", description = "操作日志"),
        (name = "config", description = "系统设置（站点名 / Logo / 登录背景图等）")
    ),
    paths(
        crate::handlers::auth::login,
        crate::handlers::auth::refresh,
        crate::handlers::auth::logout,
        crate::handlers::auth::userinfo,
        crate::handlers::auth::user_menus,
        crate::handlers::user::list,
        crate::handlers::user::detail,
        crate::handlers::user::create,
        crate::handlers::user::update,
        crate::handlers::user::remove,
        crate::handlers::user::set_status,
        crate::handlers::user::reset_password,
        crate::handlers::user::assign_roles,
        crate::handlers::user::change_own_password,
        crate::handlers::role::list,
        crate::handlers::role::detail,
        crate::handlers::role::create,
        crate::handlers::role::update,
        crate::handlers::role::remove,
        crate::handlers::role::menu_ids,
        crate::handlers::role::assign_menus,
        crate::handlers::role::dept_ids,
        crate::handlers::role::assign_depts,
        crate::handlers::role::set_status,
        crate::handlers::menu::list,
        crate::handlers::menu::detail,
        crate::handlers::menu::create,
        crate::handlers::menu::update,
        crate::handlers::menu::remove,
        crate::handlers::dept::list,
        crate::handlers::dept::detail,
        crate::handlers::dept::create,
        crate::handlers::dept::update,
        crate::handlers::dept::remove,
        crate::handlers::dict::list_types,
        crate::handlers::dict::type_detail,
        crate::handlers::dict::create_type,
        crate::handlers::dict::update_type,
        crate::handlers::dict::remove_type,
        crate::handlers::dict::list_items,
        crate::handlers::dict::list_items_by_code,
        crate::handlers::dict::create_item,
        crate::handlers::dict::update_item,
        crate::handlers::dict::remove_item,
        crate::handlers::post::list,
        crate::handlers::post::detail,
        crate::handlers::post::create,
        crate::handlers::post::update,
        crate::handlers::post::remove,
        crate::handlers::param::list,
        crate::handlers::param::detail,
        crate::handlers::param::create,
        crate::handlers::param::update,
        crate::handlers::param::remove,
        crate::handlers::notice::list,
        crate::handlers::notice::detail,
        crate::handlers::notice::create,
        crate::handlers::notice::update,
        crate::handlers::notice::remove,
        crate::handlers::message::list,
        crate::handlers::message::send,
        crate::handlers::message::remove,
        crate::handlers::message::inbox,
        crate::handlers::message::unread_count,
        crate::handlers::message::view,
        crate::handlers::message::mark_read,
        crate::handlers::message::mark_all_read,
        crate::handlers::message::delete_inbox,
        crate::handlers::job::list,
        crate::handlers::job::detail,
        crate::handlers::job::create,
        crate::handlers::job::update,
        crate::handlers::job::remove,
        crate::handlers::job::set_status,
        crate::handlers::job::run_once,
        crate::handlers::job::logs,
        crate::handlers::tenant::list,
        crate::handlers::tenant::detail,
        crate::handlers::tenant::create,
        crate::handlers::tenant::update,
        crate::handlers::tenant::set_status,
        crate::handlers::tenant::remove,
        crate::handlers::log::list,
        crate::handlers::config::public_settings,
        crate::handlers::config::get_settings,
        crate::handlers::config::update_settings,
    )
)]
pub struct ApiDoc;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn openapi_doc_is_complete() {
        let doc = ApiDoc::openapi();
        let json = doc.to_pretty_json().expect("serialize openapi");
        // path count and a few representative schemas must be present
        assert!(json.contains("/api/v1/auth/login"));
        assert!(json.contains("/api/v1/users/{id}"));
        assert!(json.contains("LoginReq"));
        assert!(json.contains("UserModel"));
        assert!(json.contains("PageResult"));
        assert!(json.contains("bearer"));
        // distinct path templates (multi-method routes collapse into one key)
        let paths = doc.paths.paths.len();
        assert!(paths >= 20, "expected >=20 paths, got {paths}");
    }
}
