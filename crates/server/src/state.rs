use service::Services;

/// Shared application state handed to every handler and middleware.
#[derive(Clone)]
pub struct AppState {
    pub services: Services,
}
