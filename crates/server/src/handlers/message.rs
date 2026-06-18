use axum::extract::{Path, Query, State};
use axum::Extension;
use common::response::{ApiResponse, PageResult};
use common::AppResult;
use service::dto::{
    CurrentUser, InboxItem, InboxQuery, MessageQuery, SendMessageReq, SentMessageItem, UnreadCount,
};

use crate::extract::ValidatedJson;
use crate::state::AppState;

// ------------------------------ admin ------------------------------

#[utoipa::path(
    get,
    path = "/api/v1/messages",
    tag = "message",
    params(MessageQuery),
    security(("bearer" = [])),
    responses((status = 200, description = "已发送消息分页列表", body = PageResult<SentMessageItem>))
)]
pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<MessageQuery>,
) -> AppResult<ApiResponse<PageResult<SentMessageItem>>> {
    let page = state.services.list_messages(&current, query).await?;
    Ok(ApiResponse::ok(page))
}

#[utoipa::path(
    post,
    path = "/api/v1/messages",
    tag = "message",
    request_body = SendMessageReq,
    security(("bearer" = [])),
    responses((status = 200, description = "发送消息", body = entity::message::Model))
)]
pub async fn send(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<SendMessageReq>,
) -> AppResult<ApiResponse<entity::message::Model>> {
    let message = state.services.send_message(&current, req).await?;
    Ok(ApiResponse::ok(message))
}

#[utoipa::path(
    delete,
    path = "/api/v1/messages/{id}",
    tag = "message",
    params(("id" = i64, Path, description = "消息 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除消息"))
)]
pub async fn remove(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_message(&current, id).await?;
    Ok(ApiResponse::ok(()))
}

// ------------------------------ personal inbox ------------------------------

#[utoipa::path(
    get,
    path = "/api/v1/my/messages",
    tag = "message",
    params(InboxQuery),
    security(("bearer" = [])),
    responses((status = 200, description = "我的收件箱", body = PageResult<InboxItem>))
)]
pub async fn inbox(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<InboxQuery>,
) -> AppResult<ApiResponse<PageResult<InboxItem>>> {
    let page = state.services.list_inbox(&current, query).await?;
    Ok(ApiResponse::ok(page))
}

#[utoipa::path(
    get,
    path = "/api/v1/my/messages/unread-count",
    tag = "message",
    security(("bearer" = [])),
    responses((status = 200, description = "未读消息数", body = UnreadCount))
)]
pub async fn unread_count(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
) -> AppResult<ApiResponse<UnreadCount>> {
    let count = state.services.unread_count(&current).await?;
    Ok(ApiResponse::ok(count))
}

#[utoipa::path(
    get,
    path = "/api/v1/my/messages/{id}",
    tag = "message",
    params(("id" = i64, Path, description = "消息 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "查看消息（自动标记已读）", body = InboxItem))
)]
pub async fn view(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<InboxItem>> {
    let item = state.services.view_inbox_message(&current, id).await?;
    Ok(ApiResponse::ok(item))
}

#[utoipa::path(
    put,
    path = "/api/v1/my/messages/{id}/read",
    tag = "message",
    params(("id" = i64, Path, description = "消息 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "标记已读"))
)]
pub async fn mark_read(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.mark_message_read(&current, id).await?;
    Ok(ApiResponse::ok(()))
}

#[utoipa::path(
    put,
    path = "/api/v1/my/messages/read-all",
    tag = "message",
    security(("bearer" = [])),
    responses((status = 200, description = "全部标记已读"))
)]
pub async fn mark_all_read(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
) -> AppResult<ApiResponse<()>> {
    state.services.mark_all_read(&current).await?;
    Ok(ApiResponse::ok(()))
}

#[utoipa::path(
    delete,
    path = "/api/v1/my/messages/{id}",
    tag = "message",
    params(("id" = i64, Path, description = "消息 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "从收件箱删除"))
)]
pub async fn delete_inbox(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_inbox_message(&current, id).await?;
    Ok(ApiResponse::ok(()))
}
