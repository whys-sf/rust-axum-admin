use axum::extract::{FromRequest, Request};
use axum::Json;
use common::AppError;
use serde::de::DeserializeOwned;
use validator::Validate;

/// `Json<T>` plus `validator` validation. Rejects with a 400 on either a
/// malformed body or a failed validation.
pub struct ValidatedJson<T>(pub T);

impl<T, S> FromRequest<S> for ValidatedJson<T>
where
    T: DeserializeOwned + Validate,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        let Json(value) = Json::<T>::from_request(req, state)
            .await
            .map_err(|e| AppError::bad_request(format!("请求体解析失败: {e}")))?;
        value
            .validate()
            .map_err(|e| AppError::bad_request(format!("参数校验失败: {e}")))?;
        Ok(ValidatedJson(value))
    }
}
