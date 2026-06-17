use axum::routing::{get, post, put};
use axum::Router;

use crate::handlers;
use crate::middleware as mw;
use crate::state::AppState;

fn user_routes() -> Router<AppState> {
    Router::new()
        .route("/users", get(handlers::user::list).post(handlers::user::create))
        .route(
            "/users/{id}",
            get(handlers::user::detail)
                .put(handlers::user::update)
                .delete(handlers::user::remove),
        )
        .route("/users/{id}/status", put(handlers::user::set_status))
        .route("/users/{id}/password", put(handlers::user::reset_password))
        .route("/users/{id}/roles", put(handlers::user::assign_roles))
        .route("/profile/password", put(handlers::user::change_own_password))
}

fn role_routes() -> Router<AppState> {
    Router::new()
        .route("/roles", get(handlers::role::list).post(handlers::role::create))
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
        .route("/roles/{id}/status", put(handlers::role::set_status))
}

fn menu_routes() -> Router<AppState> {
    Router::new()
        .route("/menus", get(handlers::menu::list).post(handlers::menu::create))
        .route(
            "/menus/{id}",
            get(handlers::menu::detail)
                .put(handlers::menu::update)
                .delete(handlers::menu::remove),
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
        .route("/platform/tenants/{id}/status", put(handlers::tenant::set_status))
}

pub fn api_router(state: AppState) -> Router {
    let public = Router::new()
        .route("/auth/login", post(handlers::auth::login))
        .route("/auth/refresh", post(handlers::auth::refresh));

    // tenant-scoped, RBAC-enforced resource routes.
    // layer order (outermost first): auth -> tenant -> operation_log -> casbin
    let rbac = Router::new()
        .merge(user_routes())
        .merge(role_routes())
        .merge(menu_routes())
        .route("/logs", get(handlers::log::list))
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

    Router::new()
        .route("/health", get(|| async { "ok" }))
        .nest("/api/v1", api)
        .with_state(state)
}
