//! End-to-end API tests exercising the assembled router against a live
//! PostgreSQL + Redis. Configure via `DATABASE_URL` / `REDIS_URL`; both default
//! to local instances. The app runs migrations + seed on first init, so the
//! `platform/superadmin` and `demo/admin` accounts are always available.
//!
//! All tests share a single multi-threaded runtime (and a single app/DB pool)
//! via `rt()`. This is deliberate: a `#[tokio::test]` builds a fresh runtime per
//! test, and a connection pool created inside one test's runtime stops working
//! once that runtime is dropped — which would hang every later test.

use std::sync::{Arc, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use common::config::{
    CasbinConfig, DatabaseConfig, JwtConfig, RedisConfig, ServerConfig, Settings, SnowflakeConfig,
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tokio::runtime::Runtime;
use tokio::sync::OnceCell;
use tower::ServiceExt;

static RT: OnceLock<Runtime> = OnceLock::new();
static APP: OnceCell<Router> = OnceCell::const_new();

fn rt() -> &'static Runtime {
    RT.get_or_init(|| {
        tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .expect("build runtime")
    })
}

fn test_settings() -> Settings {
    let manifest = env!("CARGO_MANIFEST_DIR");
    let model_path = format!("{manifest}/../../rbac_model.conf");
    Settings {
        server: ServerConfig {
            addr: "127.0.0.1:0".into(),
        },
        database: DatabaseConfig {
            url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/admin".into()),
            max_connections: 5,
        },
        redis: RedisConfig {
            url: std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into()),
        },
        jwt: JwtConfig {
            secret: "integration_test_secret_at_least_32_chars_long".into(),
            access_ttl: 900,
            refresh_ttl: 604800,
        },
        snowflake: SnowflakeConfig {
            worker_id: 1,
            datacenter_id: 1,
        },
        casbin: CasbinConfig { model_path },
    }
}

async fn app() -> &'static Router {
    APP.get_or_init(|| async {
        let state = server::init_state(Arc::new(test_settings()))
            .await
            .expect("init app state");
        server::build_app(state)
    })
    .await
}

/// Unique suffix so repeated test runs against a persistent DB don't collide.
fn uniq() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    format!("{nanos}")
}

async fn send(
    method: &str,
    uri: &str,
    token: Option<&str>,
    body: Option<Value>,
) -> (StatusCode, Value) {
    let mut builder = Request::builder().method(method).uri(uri);
    if let Some(t) = token {
        builder = builder.header("Authorization", format!("Bearer {t}"));
    }
    let req = match body {
        Some(b) => builder
            .header("Content-Type", "application/json")
            .body(Body::from(b.to_string()))
            .unwrap(),
        None => builder.body(Body::empty()).unwrap(),
    };

    let resp = app().await.clone().oneshot(req).await.unwrap();
    let status = resp.status();
    let bytes = resp.into_body().collect().await.unwrap().to_bytes();
    let value: Value = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).unwrap_or(Value::Null)
    };
    (status, value)
}

async fn login(tenant: &str, username: &str, password: &str) -> String {
    let (status, body) = send(
        "POST",
        "/api/v1/auth/login",
        None,
        Some(json!({"tenant_code": tenant, "username": username, "password": password})),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "login failed: {body}");
    body["data"]["access_token"]
        .as_str()
        .expect("access_token")
        .to_string()
}

#[test]
#[ignore = "requires postgres + redis; run via the integration workflow with `--ignored`"]
fn health_ok() {
    rt().block_on(async {
        let (status, _) = send("GET", "/health", None, None).await;
        assert_eq!(status, StatusCode::OK);
    });
}

#[test]
#[ignore = "requires postgres + redis; run via the integration workflow with `--ignored`"]
fn login_and_userinfo_platform() {
    rt().block_on(async {
        let token = login("platform", "superadmin", "Admin@123456").await;
        let (status, body) = send("GET", "/api/v1/auth/userinfo", Some(&token), None).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"]["username"], "superadmin");
        assert_eq!(body["data"]["is_platform"], true);
    });
}

#[test]
#[ignore = "requires postgres + redis; run via the integration workflow with `--ignored`"]
fn userinfo_requires_auth() {
    rt().block_on(async {
        let (status, _) = send("GET", "/api/v1/auth/userinfo", None, None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    });
}

#[test]
#[ignore = "requires postgres + redis; run via the integration workflow with `--ignored`"]
fn bad_token_rejected() {
    rt().block_on(async {
        let (status, _) = send("GET", "/api/v1/auth/userinfo", Some("not-a-jwt"), None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    });
}

#[test]
#[ignore = "requires postgres + redis; run via the integration workflow with `--ignored`"]
fn tenant_admin_rbac_and_isolation() {
    rt().block_on(async {
        let token = login("demo", "admin", "Admin@123456").await;

        // allowed: tenant admin role has users:list
        let (status, body) = send("GET", "/api/v1/users", Some(&token), None).await;
        assert_eq!(status, StatusCode::OK, "{body}");

        // pagination query params must parse (regression: serde_urlencoded + u64)
        let (status, _) = send(
            "GET",
            "/api/v1/roles?page=1&page_size=5",
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK);

        // forbidden: platform-only endpoint for a non-platform user
        let (status, _) = send("GET", "/api/v1/platform/tenants", Some(&token), None).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
    });
}

#[test]
#[ignore = "requires postgres + redis; run via the integration workflow with `--ignored`"]
fn create_tenant_then_login_as_its_admin() {
    rt().block_on(async {
        let platform = login("platform", "superadmin", "Admin@123456").await;

        let suffix = uniq();
        let code = format!("t{suffix}");
        let admin_user = format!("admin{suffix}");
        let (status, body) = send(
            "POST",
            "/api/v1/platform/tenants",
            Some(&platform),
            Some(json!({
                "name": format!("Tenant {suffix}"),
                "code": code,
                "admin_username": admin_user,
                "admin_password": "Tenant@123456",
                "user_limit": 10
            })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "create tenant: {body}");

        // the freshly created tenant admin can log in and is correctly scoped
        let token = login(&code, &admin_user, "Tenant@123456").await;
        let (status, body) = send("GET", "/api/v1/auth/userinfo", Some(&token), None).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"]["is_platform"], false);
        let roles = body["data"]["roles"].as_array().expect("roles");
        assert!(roles.iter().any(|r| r == "admin"), "expected admin role");
    });
}

#[test]
#[ignore = "requires postgres + redis; run via the integration workflow with `--ignored`"]
fn invalid_login_rejected() {
    rt().block_on(async {
        // Use a throwaway tenant+admin so the per-account lockout counter is
        // pristine and a single wrong attempt yields 401 (not the lock 400).
        let platform = login("platform", "superadmin", "Admin@123456").await;
        let suffix = uniq();
        let code = format!("t{suffix}");
        let admin_user = format!("admin{suffix}");
        let (status, _) = send(
            "POST",
            "/api/v1/platform/tenants",
            Some(&platform),
            Some(json!({
                "name": format!("Tenant {suffix}"),
                "code": code,
                "admin_username": admin_user,
                "admin_password": "Tenant@123456"
            })),
        )
        .await;
        assert_eq!(status, StatusCode::OK);

        let (status, _) = send(
            "POST",
            "/api/v1/auth/login",
            None,
            Some(
                json!({"tenant_code": code, "username": admin_user, "password": "wrong-password"}),
            ),
        )
        .await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    });
}
