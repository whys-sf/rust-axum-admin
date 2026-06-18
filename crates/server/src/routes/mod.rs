use axum::routing::{get, post, put};
use axum::Router;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::handlers;
use crate::middleware as mw;
use crate::openapi::ApiDoc;
use crate::state::AppState;

fn user_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/users",
            get(handlers::user::list).post(handlers::user::create),
        )
        .route(
            "/users/{id}",
            get(handlers::user::detail)
                .put(handlers::user::update)
                .delete(handlers::user::remove),
        )
        .route("/users/{id}/status", put(handlers::user::set_status))
        .route("/users/{id}/password", put(handlers::user::reset_password))
        .route("/users/{id}/roles", put(handlers::user::assign_roles))
        .route(
            "/profile/password",
            put(handlers::user::change_own_password),
        )
}

fn role_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/roles",
            get(handlers::role::list).post(handlers::role::create),
        )
        .route(
            "/roles/{id}",
            get(handlers::role::detail)
                .put(handlers::role::update)
                .delete(handlers::role::remove),
        )
        .route(
            "/roles/{id}/menus",
            get(handlers::role::menu_ids).put(handlers::role::assign_menus),
        )
        .route(
            "/roles/{id}/depts",
            get(handlers::role::dept_ids).put(handlers::role::assign_depts),
        )
        .route("/roles/{id}/status", put(handlers::role::set_status))
}

fn menu_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/menus",
            get(handlers::menu::list).post(handlers::menu::create),
        )
        .route(
            "/menus/{id}",
            get(handlers::menu::detail)
                .put(handlers::menu::update)
                .delete(handlers::menu::remove),
        )
}

fn dept_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/depts",
            get(handlers::dept::list).post(handlers::dept::create),
        )
        .route(
            "/depts/{id}",
            get(handlers::dept::detail)
                .put(handlers::dept::update)
                .delete(handlers::dept::remove),
        )
}

fn dict_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/dicts/types",
            get(handlers::dict::list_types).post(handlers::dict::create_type),
        )
        .route(
            "/dicts/types/{id}",
            get(handlers::dict::type_detail)
                .put(handlers::dict::update_type)
                .delete(handlers::dict::remove_type),
        )
        .route("/dicts/types/{id}/items", get(handlers::dict::list_items))
        .route(
            "/dicts/code/{code}/items",
            get(handlers::dict::list_items_by_code),
        )
        .route("/dicts/items", post(handlers::dict::create_item))
        .route(
            "/dicts/items/{id}",
            put(handlers::dict::update_item).delete(handlers::dict::remove_item),
        )
}

fn crud_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/posts",
            get(handlers::post::list).post(handlers::post::create),
        )
        .route(
            "/posts/{id}",
            get(handlers::post::detail)
                .put(handlers::post::update)
                .delete(handlers::post::remove),
        )
        .route(
            "/params",
            get(handlers::param::list).post(handlers::param::create),
        )
        .route(
            "/params/{id}",
            get(handlers::param::detail)
                .put(handlers::param::update)
                .delete(handlers::param::remove),
        )
        .route(
            "/notices",
            get(handlers::notice::list).post(handlers::notice::create),
        )
        .route(
            "/notices/{id}",
            get(handlers::notice::detail)
                .put(handlers::notice::update)
                .delete(handlers::notice::remove),
        )
}

fn tenant_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/platform/tenants",
            get(handlers::tenant::list).post(handlers::tenant::create),
        )
        .route(
            "/platform/tenants/{id}",
            get(handlers::tenant::detail)
                .put(handlers::tenant::update)
                .delete(handlers::tenant::remove),
        )
        .route(
            "/platform/tenants/{id}/status",
            put(handlers::tenant::set_status),
        )
}

pub fn api_router(state: AppState) -> Router {
    let public = Router::new()
        .route("/auth/login", post(handlers::auth::login))
        .route("/auth/refresh", post(handlers::auth::refresh))
        .route("/public/settings", get(handlers::config::public_settings));

    // tenant-scoped, RBAC-enforced resource routes.
    // layer order (outermost first): auth -> tenant -> operation_log -> casbin
    let rbac = Router::new()
        .merge(user_routes())
        .merge(role_routes())
        .merge(menu_routes())
        .merge(dept_routes())
        .merge(dict_routes())
        .merge(crud_routes())
        .route("/logs", get(handlers::log::list))
        .route(
            "/settings",
            get(handlers::config::get_settings).put(handlers::config::update_settings),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            mw::casbin_auth::guard,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            mw::operation_log::record,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            mw::tenant::resolve,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            mw::auth::guard,
        ));

    // identity endpoints: authenticated but not permission-gated, since every
    // logged-in user needs them.
    let identity = Router::new()
        .route("/auth/logout", post(handlers::auth::logout))
        .route("/auth/userinfo", get(handlers::auth::userinfo))
        .route("/auth/menus", get(handlers::auth::user_menus))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            mw::tenant::resolve,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            mw::auth::guard,
        ));

    // platform-admin-only routes (no tenant/casbin layer)
    let platform = tenant_routes()
        .layer(axum::middleware::from_fn(mw::auth::platform_only))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            mw::auth::guard,
        ));

    let api = Router::new()
        .merge(public)
        .merge(identity)
        .merge(rbac)
        .merge(platform);

    let enable_swagger = state.services.settings.server.enable_swagger;

    let mut router = Router::new()
        .route("/health", get(|| async { "ok" }))
        .nest("/api/v1", api)
        .with_state(state);

    // Only expose the API surface when explicitly enabled (off in production).
    if enable_swagger {
        router = router
            .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()));
    }
    router
}
