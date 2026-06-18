use axum::extract::{Query, State};
use axum::Extension;
use common::response::{ApiResponse, PageResult};
use common::AppResult;
use serde::Deserialize;
use service::dto::{CurrentUser, PageQuery};

use crate::state::AppState;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct LogQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub username: Option<String>,
}

#[utoipa::path(
    get,
    path = "/api/v1/logs",
    tag = "log",
    params(LogQuery),
    security(("bearer" = [])),
    responses((status = 200, description = "操作日志分页列表", body = PageResult<entity::operation_log::Model>))
)]
pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<LogQuery>,
) -> AppResult<ApiResponse<PageResult<entity::operation_log::Model>>> {
    let page = PageQuery::new(query.page.unwrap_or(1), query.page_size.unwrap_or(10));
    let result = state
        .services
        .list_logs(&current, page, query.username)
        .await?;
    Ok(ApiResponse::ok(result))
}
