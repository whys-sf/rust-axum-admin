use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use chrono::Utc;
use sea_orm::{ActiveModelTrait, Set};
use service::dto::CurrentUser;
use std::time::Instant;

use crate::state::AppState;

fn client_ip(req: &Request) -> Option<String> {
    for header in ["x-forwarded-for", "x-real-ip"] {
        if let Some(v) = req.headers().get(header).and_then(|v| v.to_str().ok()) {
            if let Some(first) = v.split(',').next() {
                return Some(first.trim().to_string());
            }
        }
    }
    None
}

/// Record each request to `sys_operation_log` asynchronously (non-blocking).
pub async fn record(State(state): State<AppState>, req: Request, next: Next) -> Response {
    let method = req.method().to_string();
    let path = req
        .extensions()
        .get::<axum::extract::OriginalUri>()
        .map(|o| o.0.path().to_string())
        .unwrap_or_else(|| req.uri().path().to_string());
    let ip = client_ip(&req);
    let user_agent = req
        .headers()
        .get(axum::http::header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.chars().take(500).collect::<String>());

    let current = req.extensions().get::<CurrentUser>().cloned();

    let start = Instant::now();
    let response = next.run(req).await;
    let duration_ms = start.elapsed().as_millis() as i64;
    let status_code = response.status().as_u16() as i32;

    // only log mutating requests to avoid noise from list/detail reads
    if matches!(method.as_str(), "POST" | "PUT" | "DELETE" | "PATCH") {
        let id = state.services.next_id();
        let db = state.services.db.clone();
        tokio::spawn(async move {
            let (tenant_id, user_id, username) = match current {
                Some(c) => (Some(c.tenant_id), Some(c.id), Some(c.username)),
                None => (None, None, None),
            };
            let log = entity::operation_log::ActiveModel {
                id: Set(id),
                tenant_id: Set(tenant_id),
                user_id: Set(user_id),
                username: Set(username),
                module: Set(None),
                action: Set(None),
                method: Set(Some(method)),
                path: Set(Some(path)),
                ip: Set(ip),
                user_agent: Set(user_agent),
                request_body: Set(None),
                status_code: Set(Some(status_code)),
                duration_ms: Set(Some(duration_ms)),
                error_msg: Set(None),
                created_at: Set(Utc::now()),
            };
            if let Err(e) = log.insert(&db).await {
                tracing::warn!(error = %e, "failed to write operation log");
            }
        });
    }

    response
}
