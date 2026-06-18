use axum::extract::{Path, Query, State};
use axum::Extension;
use common::response::{ApiResponse, PageResult};
use common::AppResult;
use service::dto::{
    CreateJobReq, CurrentUser, JobLogQuery, JobQuery, SetJobStatusReq, UpdateJobReq,
};

use crate::extract::ValidatedJson;
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/api/v1/jobs",
    tag = "job",
    params(JobQuery),
    security(("bearer" = [])),
    responses((status = 200, description = "定时任务分页列表", body = PageResult<entity::job::Model>))
)]
pub async fn list(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<JobQuery>,
) -> AppResult<ApiResponse<PageResult<entity::job::Model>>> {
    let page = state.services.list_jobs(&current, query).await?;
    Ok(ApiResponse::ok(page))
}

#[utoipa::path(
    get,
    path = "/api/v1/jobs/{id}",
    tag = "job",
    params(("id" = i64, Path, description = "任务 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "任务详情", body = entity::job::Model))
)]
pub async fn detail(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<entity::job::Model>> {
    let job = state.services.get_job(&current, id).await?;
    Ok(ApiResponse::ok(job))
}

#[utoipa::path(
    post,
    path = "/api/v1/jobs",
    tag = "job",
    request_body = CreateJobReq,
    security(("bearer" = [])),
    responses((status = 200, description = "创建任务", body = entity::job::Model))
)]
pub async fn create(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    ValidatedJson(req): ValidatedJson<CreateJobReq>,
) -> AppResult<ApiResponse<entity::job::Model>> {
    let job = state.services.create_job(&current, req).await?;
    Ok(ApiResponse::ok(job))
}

#[utoipa::path(
    put,
    path = "/api/v1/jobs/{id}",
    tag = "job",
    params(("id" = i64, Path, description = "任务 ID")),
    request_body = UpdateJobReq,
    security(("bearer" = [])),
    responses((status = 200, description = "更新任务", body = entity::job::Model))
)]
pub async fn update(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<UpdateJobReq>,
) -> AppResult<ApiResponse<entity::job::Model>> {
    let job = state.services.update_job(&current, id, req).await?;
    Ok(ApiResponse::ok(job))
}

#[utoipa::path(
    delete,
    path = "/api/v1/jobs/{id}",
    tag = "job",
    params(("id" = i64, Path, description = "任务 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "删除任务"))
)]
pub async fn remove(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<()>> {
    state.services.delete_job(&current, id).await?;
    Ok(ApiResponse::ok(()))
}

#[utoipa::path(
    put,
    path = "/api/v1/jobs/{id}/status",
    tag = "job",
    params(("id" = i64, Path, description = "任务 ID")),
    request_body = SetJobStatusReq,
    security(("bearer" = [])),
    responses((status = 200, description = "启停任务", body = entity::job::Model))
)]
pub async fn set_status(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
    ValidatedJson(req): ValidatedJson<SetJobStatusReq>,
) -> AppResult<ApiResponse<entity::job::Model>> {
    let job = state.services.set_job_status(&current, id, req).await?;
    Ok(ApiResponse::ok(job))
}

#[utoipa::path(
    post,
    path = "/api/v1/jobs/{id}/run",
    tag = "job",
    params(("id" = i64, Path, description = "任务 ID")),
    security(("bearer" = [])),
    responses((status = 200, description = "立即执行一次", body = entity::job_log::Model))
)]
pub async fn run_once(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Path(id): Path<i64>,
) -> AppResult<ApiResponse<entity::job_log::Model>> {
    let log = state.services.run_job_once(&current, id).await?;
    Ok(ApiResponse::ok(log))
}

#[utoipa::path(
    get,
    path = "/api/v1/job-logs",
    tag = "job",
    params(JobLogQuery),
    security(("bearer" = [])),
    responses((status = 200, description = "任务执行日志分页列表", body = PageResult<entity::job_log::Model>))
)]
pub async fn logs(
    State(state): State<AppState>,
    Extension(current): Extension<CurrentUser>,
    Query(query): Query<JobLogQuery>,
) -> AppResult<ApiResponse<PageResult<entity::job_log::Model>>> {
    let page = state.services.list_job_logs(&current, query).await?;
    Ok(ApiResponse::ok(page))
}
