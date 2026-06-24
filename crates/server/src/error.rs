use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use common::AppError;
use serde_json::json;

pub type HttpResult<T> = Result<T, HttpError>;

#[derive(Debug)]
pub struct HttpError(pub AppError);

impl From<AppError> for HttpError {
    fn from(error: AppError) -> Self {
        Self(error)
    }
}

impl IntoResponse for HttpError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self.0 {
            AppError::BadRequest(m) => (StatusCode::BAD_REQUEST, 400, m.clone()),
            AppError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                401,
                "未认证或登录已过期".to_string(),
            ),
            AppError::Forbidden => (StatusCode::FORBIDDEN, 403, "无权限访问".to_string()),
            AppError::NotFound(m) => (StatusCode::NOT_FOUND, 404, m.clone()),
            AppError::Conflict(m) => (StatusCode::CONFLICT, 409, m.clone()),
            AppError::Db(e) => {
                tracing::error!(error = %e, "database error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    500,
                    "服务器内部错误".to_string(),
                )
            }
            AppError::Casbin(e) => {
                tracing::error!(error = %e, "casbin error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    500,
                    "权限引擎错误".to_string(),
                )
            }
            AppError::Other(e) => {
                tracing::error!(error = %e, "internal error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    500,
                    "服务器内部错误".to_string(),
                )
            }
        };

        let body = Json(json!({ "code": code, "message": message, "data": null }));
        (status, body).into_response()
    }
}
