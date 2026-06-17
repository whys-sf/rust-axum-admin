use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

pub type AppResult<T> = Result<T, AppError>;

#[derive(thiserror::Error, Debug)]
pub enum AppError {
    #[error("{0}")]
    BadRequest(String),

    #[error("unauthorized")]
    Unauthorized,

    #[error("forbidden")]
    Forbidden,

    #[error("{0}")]
    NotFound(String),

    #[error("{0}")]
    Conflict(String),

    #[error(transparent)]
    Db(#[from] sea_orm::DbErr),

    #[error(transparent)]
    Casbin(#[from] casbin::Error),

    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

impl AppError {
    pub fn bad_request(msg: impl Into<String>) -> Self {
        AppError::BadRequest(msg.into())
    }

    pub fn not_found(msg: impl Into<String>) -> Self {
        AppError::NotFound(msg.into())
    }

    pub fn conflict(msg: impl Into<String>) -> Self {
        AppError::Conflict(msg.into())
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            AppError::BadRequest(m) => (StatusCode::BAD_REQUEST, 400, m.clone()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, 401, "未认证或登录已过期".to_string()),
            AppError::Forbidden => (StatusCode::FORBIDDEN, 403, "无权限访问".to_string()),
            AppError::NotFound(m) => (StatusCode::NOT_FOUND, 404, m.clone()),
            AppError::Conflict(m) => (StatusCode::CONFLICT, 409, m.clone()),
            AppError::Db(e) => {
                tracing::error!(error = %e, "database error");
                (StatusCode::INTERNAL_SERVER_ERROR, 500, "服务器内部错误".to_string())
            }
            AppError::Casbin(e) => {
                tracing::error!(error = %e, "casbin error");
                (StatusCode::INTERNAL_SERVER_ERROR, 500, "权限引擎错误".to_string())
            }
            AppError::Other(e) => {
                tracing::error!(error = %e, "internal error");
                (StatusCode::INTERNAL_SERVER_ERROR, 500, "服务器内部错误".to_string())
            }
        };

        let body = Json(json!({ "code": code, "message": message, "data": null }));
        (status, body).into_response()
    }
}
