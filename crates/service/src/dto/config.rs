use serde::{Deserialize, Serialize};
use validator::Validate;

/// Site-wide settings. Publicly readable (login page) and editable by admins
/// with `system:config:edit`.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct AppSettings {
    pub site_name: String,
    pub login_title: String,
    pub login_subtitle: String,
    /// Login page background image URL (empty = default gradient).
    pub login_background: String,
    /// Sidebar / login logo image URL (empty = default icon).
    pub logo_url: String,
}

/// Partial update: only the provided fields are written.
#[derive(Debug, Default, Deserialize, Validate, utoipa::ToSchema)]
pub struct UpdateSettingsReq {
    #[validate(length(max = 128))]
    pub site_name: Option<String>,
    #[validate(length(max = 128))]
    pub login_title: Option<String>,
    #[validate(length(max = 255))]
    pub login_subtitle: Option<String>,
    #[validate(length(max = 1024))]
    pub login_background: Option<String>,
    #[validate(length(max = 1024))]
    pub logo_url: Option<String>,
}
