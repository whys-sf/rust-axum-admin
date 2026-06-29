use serde::{Deserialize, Serialize};
use validator::Validate;

/// Branding/settings resolved from platform defaults plus tenant overrides.
/// Public reads use platform defaults; authenticated reads use the acting tenant.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct AppSettings {
    pub site_name: String,
    pub login_title: String,
    pub login_subtitle: String,
    /// Login page background image URL (empty = default gradient).
    pub login_background: String,
    /// Sidebar / login logo image URL (empty = default icon).
    pub logo_url: String,
    /// Runtime tenant mode exposed to the frontend: "single" or "multi".
    pub tenant_mode: String,
    /// Whether the login form should ask for a tenant code.
    pub show_tenant_login: bool,
    /// Whether platform management pages are enabled for this deployment.
    pub enable_platform_console: bool,
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
