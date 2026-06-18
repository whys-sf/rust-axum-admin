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
            cors_allowed_origins: vec!["*".into()],
            enable_swagger: true,
            trust_forwarded_for: true,
            request_body_limit: 1024 * 1024,
            request_timeout_secs: 30,
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

/// Extract an i64 id from a JSON value. Ids travel as strings on the wire (so
/// JavaScript clients keep full precision), but the helper also accepts a bare
/// number for resilience.
fn as_id(v: &Value) -> Option<i64> {
    v.as_i64()
        .or_else(|| v.as_str().and_then(|s| s.parse().ok()))
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

async fn create_dept(token: &str, name: &str) -> i64 {
    let (status, body) = send(
        "POST",
        "/api/v1/depts",
        Some(token),
        Some(json!({ "parent_id": 0, "name": name })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "create dept: {body}");
    as_id(&body["data"]["id"]).expect("dept id")
}

async fn create_role(token: &str, code: &str, data_scope: i16, menu_ids: &[i64]) -> i64 {
    let (status, body) = send(
        "POST",
        "/api/v1/roles",
        Some(token),
        Some(json!({
            "name": code,
            "code": code,
            "data_scope": data_scope,
            "menu_ids": menu_ids,
        })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "create role: {body}");
    as_id(&body["data"]["id"]).expect("role id")
}

async fn create_user(token: &str, username: &str, password: &str, dept_id: i64, role_ids: &[i64]) {
    let (status, body) = send(
        "POST",
        "/api/v1/users",
        Some(token),
        Some(json!({
            "username": username,
            "password": password,
            "dept_id": dept_id,
            "role_ids": role_ids,
        })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "create user: {body}");
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
fn dept_tree_and_crud() {
    rt().block_on(async {
        let token = login("demo", "admin", "Admin@123456").await;

        // seeded org tree is visible to the tenant admin
        let (status, body) = send("GET", "/api/v1/depts", Some(&token), None).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let roots = body["data"].as_array().expect("dept tree");
        assert!(!roots.is_empty(), "expected seeded departments");
        let root_id = as_id(&roots[0]["id"]).expect("root dept id");

        // create a child under the root; ancestors must chain from the parent
        let name = format!("分部-{}", uniq());
        let (status, body) = send(
            "POST",
            "/api/v1/depts",
            Some(&token),
            Some(json!({"parent_id": root_id, "name": name, "sort": 9})),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "create dept: {body}");
        let child_id = as_id(&body["data"]["id"]).expect("child id");
        assert_eq!(body["data"]["ancestors"], format!("0,{root_id}"));

        // update the child
        let (status, body) = send(
            "PUT",
            &format!("/api/v1/depts/{child_id}"),
            Some(&token),
            Some(json!({"leader": "张三", "sort": 3})),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"]["leader"], "张三");

        // a department with children cannot be deleted
        let (status, _) = send(
            "DELETE",
            &format!("/api/v1/depts/{root_id}"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);

        // leaf delete succeeds
        let (status, _) = send(
            "DELETE",
            &format!("/api/v1/depts/{child_id}"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK);
    });
}

#[test]
#[ignore = "requires postgres + redis; run via the integration workflow with `--ignored`"]
fn data_scope_dept_and_custom() {
    rt().block_on(async {
        let admin = login("demo", "admin", "Admin@123456").await;
        let s = uniq();

        // two top-level departments in the demo tenant
        let alpha = create_dept(&admin, &format!("Alpha-{s}")).await;
        let beta = create_dept(&admin, &format!("Beta-{s}")).await;

        // role: own-department scope (data_scope = 3), can list users
        let role_dept = create_role(&admin, &format!("scope_dept_{s}"), 3, &[2]).await;
        // role: custom scope (data_scope = 2) restricted to Beta, can list users
        let role_custom = create_role(&admin, &format!("scope_custom_{s}"), 2, &[2]).await;
        let (status, _) = send(
            "PUT",
            &format!("/api/v1/roles/{role_custom}/depts"),
            Some(&admin),
            Some(json!({ "dept_ids": [beta] })),
        )
        .await;
        assert_eq!(status, StatusCode::OK);

        // users: u_alpha (Alpha, dept scope), u_beta (Beta, target only),
        // u_custom (Alpha, custom->Beta scope)
        let pw = "Scope@123456";
        let u_alpha = format!("ua{s}");
        let u_beta = format!("ub{s}");
        let u_custom = format!("uc{s}");
        create_user(&admin, &u_alpha, pw, alpha, &[role_dept]).await;
        create_user(&admin, &u_beta, pw, beta, &[]).await;
        create_user(&admin, &u_custom, pw, alpha, &[role_custom]).await;

        // u_alpha sees only its own department (Alpha)
        let token = login("demo", &u_alpha, pw).await;
        let (status, body) = send(
            "GET",
            "/api/v1/users?page=1&page_size=200",
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let list = body["data"]["list"].as_array().expect("user list");
        assert!(
            list.iter().all(|u| as_id(&u["dept_id"]) == Some(alpha)),
            "dept scope must only return own-department users: {body}"
        );
        assert!(list.iter().any(|u| u["username"] == u_alpha));
        assert!(
            !list.iter().any(|u| u["username"] == u_beta),
            "u_beta is in Beta and must be filtered out"
        );

        // u_custom's role is scoped to Beta, so it sees Beta users (u_beta) and
        // not its own department (Alpha)
        let token = login("demo", &u_custom, pw).await;
        let (status, body) = send(
            "GET",
            "/api/v1/users?page=1&page_size=200",
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let list = body["data"]["list"].as_array().expect("user list");
        assert!(
            list.iter().all(|u| as_id(&u["dept_id"]) == Some(beta)),
            "custom scope must only return the configured department: {body}"
        );
        assert!(list.iter().any(|u| u["username"] == u_beta));
        assert!(!list.iter().any(|u| u["username"] == u_custom));
    });
}

/// Recursively collect every department id in a serialized dept forest.
fn collect_dept_ids(nodes: &[Value]) -> Vec<i64> {
    let mut ids = Vec::new();
    for n in nodes {
        if let Some(id) = as_id(&n["id"]) {
            ids.push(id);
        }
        if let Some(children) = n["children"].as_array() {
            ids.extend(collect_dept_ids(children));
        }
    }
    ids
}

#[test]
#[ignore = "requires postgres + redis; run via the integration workflow with `--ignored`"]
fn data_scope_dept_tree_and_logs() {
    rt().block_on(async {
        let admin = login("demo", "admin", "Admin@123456").await;
        let s = uniq();

        // Alpha (top) with a child; Beta (top, out of scope).
        let alpha = create_dept(&admin, &format!("Alpha-{s}")).await;
        let beta = create_dept(&admin, &format!("Beta-{s}")).await;
        let (status, body) = send(
            "POST",
            "/api/v1/depts",
            Some(&admin),
            Some(json!({ "parent_id": alpha, "name": format!("AlphaChild-{s}") })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "create child dept: {body}");
        let alpha_child = as_id(&body["data"]["id"]).expect("child dept id");

        // dept-and-child scope (4); grant dept list+create (50/51) and log list (30).
        let role = create_role(&admin, &format!("scope_tree_{s}"), 4, &[30, 50, 51]).await;
        let pw = "Scope@123456";
        let u = format!("ut{s}");
        create_user(&admin, &u, pw, alpha, &[role]).await;
        let token = login("demo", &u, pw).await;

        // department tree is scoped to Alpha + its child, never Beta.
        let (status, body) = send("GET", "/api/v1/depts", Some(&token), None).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let ids = collect_dept_ids(body["data"].as_array().expect("dept forest"));
        assert!(
            ids.contains(&alpha) && ids.contains(&alpha_child),
            "must see own subtree: {ids:?}"
        );
        assert!(!ids.contains(&beta), "Beta is out of scope: {ids:?}");

        // u's own id, to verify log ownership.
        let (_, info) = send("GET", "/api/v1/auth/userinfo", Some(&token), None).await;
        let uid = as_id(&info["data"]["id"]).expect("uid");

        // a mutating request (creating a department) writes an operation log
        // attributed to u.
        let (status, _) = send(
            "POST",
            "/api/v1/depts",
            Some(&token),
            Some(json!({ "parent_id": alpha, "name": format!("UDept-{s}") })),
        )
        .await;
        assert_eq!(status, StatusCode::OK);

        // logs are written asynchronously; poll until u's entry lands. Every
        // visible row must belong to a reachable user (only u here).
        let mut seen_self = false;
        for _ in 0..40 {
            let (status, body) = send(
                "GET",
                "/api/v1/logs?page=1&page_size=200",
                Some(&token),
                None,
            )
            .await;
            assert_eq!(status, StatusCode::OK, "{body}");
            let list = body["data"]["list"].as_array().expect("log list");
            assert!(
                list.iter().all(|l| as_id(&l["user_id"]) == Some(uid)),
                "restricted log list must only contain reachable users: {body}"
            );
            if list.iter().any(|l| as_id(&l["user_id"]) == Some(uid)) {
                seen_self = true;
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        }
        assert!(seen_self, "u must see its own operation log");

        // control: the tenant admin (data_scope = all) sees other users' logs.
        let (status, body) = send(
            "GET",
            "/api/v1/logs?page=1&page_size=200",
            Some(&admin),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let admin_list = body["data"]["list"].as_array().expect("log list");
        assert!(
            admin_list.iter().any(|l| as_id(&l["user_id"]) != Some(uid)),
            "admin should see logs beyond the restricted user's"
        );
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

#[test]
#[ignore = "requires postgres + redis; run via the integration workflow with `--ignored`"]
fn settings_public_and_admin_update() {
    rt().block_on(async {
        // public endpoint is reachable without authentication
        let (status, body) = send("GET", "/api/v1/public/settings", None, None).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert!(body["data"]["site_name"].is_string());

        // demo admin holds system:config:* and may read + update settings
        let token = login("demo", "admin", "Admin@123456").await;
        let name = format!("站点-{}", uniq());
        let (status, body) = send(
            "PUT",
            "/api/v1/settings",
            Some(&token),
            Some(json!({ "site_name": name, "login_subtitle": "欢迎" })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"]["site_name"], name);

        // the update is visible through the public endpoint
        let (status, body) = send("GET", "/api/v1/public/settings", None, None).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"]["site_name"], name);
        assert_eq!(body["data"]["login_subtitle"], "欢迎");
    });
}

#[test]
#[ignore = "requires postgres + redis; run via the integration workflow with `--ignored`"]
fn dict_type_and_items_tree_and_flat() {
    rt().block_on(async {
        let token = login("demo", "admin", "Admin@123456").await;

        // create a flat dictionary type with a unique code
        let code = format!("test_dict_{}", uniq());
        let (status, body) = send(
            "POST",
            "/api/v1/dicts/types",
            Some(&token),
            Some(json!({ "code": code, "name": "测试字典", "is_tree": true })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let type_id = as_id(&body["data"]["id"]).expect("type id");
        assert_eq!(body["data"]["is_tree"], true);

        // duplicate code is rejected
        let (status, _) = send(
            "POST",
            "/api/v1/dicts/types",
            Some(&token),
            Some(json!({ "code": code, "name": "dup" })),
        )
        .await;
        assert_eq!(status, StatusCode::CONFLICT);

        // create a parent + child item (tree)
        let (status, body) = send(
            "POST",
            "/api/v1/dicts/items",
            Some(&token),
            Some(json!({ "dict_code": code, "label": "省", "value": "P" })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let parent_id = as_id(&body["data"]["id"]).expect("item id");

        let (status, body) = send(
            "POST",
            "/api/v1/dicts/items",
            Some(&token),
            Some(json!({ "dict_code": code, "parent_id": parent_id.to_string(), "label": "市", "value": "C" })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");

        // tree listing nests the child under the parent
        let (status, body) = send(
            "GET",
            &format!("/api/v1/dicts/types/{type_id}/items"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"].as_array().expect("array").len(), 1);
        assert_eq!(body["data"][0]["children"][0]["label"], "市");

        // a parent with children cannot be deleted
        let (status, _) = send(
            "DELETE",
            &format!("/api/v1/dicts/items/{parent_id}"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);

        // code lookup returns the same items
        let (status, body) = send(
            "GET",
            &format!("/api/v1/dicts/code/{code}/items"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"].as_array().expect("array").len(), 1);

        // deleting the type cascades the items away
        let (status, _) = send(
            "DELETE",
            &format!("/api/v1/dicts/types/{type_id}"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        let (status, body) = send(
            "GET",
            &format!("/api/v1/dicts/code/{code}/items"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"].as_array().expect("array").len(), 0);
    });
}

#[test]
#[ignore = "requires postgres + redis; run via the integration workflow with `--ignored`"]
fn post_param_notice_crud() {
    rt().block_on(async {
        let token = login("demo", "admin", "Admin@123456").await;

        // ---- post: create, duplicate code conflict, list, delete ----
        let code = format!("post_{}", uniq());
        let (status, body) = send(
            "POST",
            "/api/v1/posts",
            Some(&token),
            Some(json!({ "code": code, "name": "测试岗位" })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let post_id = as_id(&body["data"]["id"]).expect("post id");

        let (status, _) = send(
            "POST",
            "/api/v1/posts",
            Some(&token),
            Some(json!({ "code": code, "name": "dup" })),
        )
        .await;
        assert_eq!(status, StatusCode::CONFLICT);

        let (status, body) = send("GET", "/api/v1/posts", Some(&token), None).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert!(body["data"]["total"].as_u64().unwrap() >= 1);

        let (status, _) = send(
            "DELETE",
            &format!("/api/v1/posts/{post_id}"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK);

        // ---- param: built-in (seeded) cannot be deleted, custom can ----
        let key = format!("test.key.{}", uniq());
        let (status, body) = send(
            "POST",
            "/api/v1/params",
            Some(&token),
            Some(json!({ "name": "测试参数", "param_key": key, "param_value": "1" })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let param_id = as_id(&body["data"]["id"]).expect("param id");
        assert_eq!(body["data"]["param_type"], 2);

        // seeded built-in param id=1410 is protected
        let (status, _) = send("DELETE", "/api/v1/params/1410", Some(&token), None).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);

        let (status, _) = send(
            "DELETE",
            &format!("/api/v1/params/{param_id}"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK);

        // ---- notice: create, update, delete ----
        let (status, body) = send(
            "POST",
            "/api/v1/notices",
            Some(&token),
            Some(json!({ "title": "测试公告", "notice_type": 2, "content": "hello" })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let notice_id = as_id(&body["data"]["id"]).expect("notice id");

        let (status, body) = send(
            "PUT",
            &format!("/api/v1/notices/{notice_id}"),
            Some(&token),
            Some(json!({ "title": "已更新公告" })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"]["title"], "已更新公告");

        let (status, _) = send(
            "DELETE",
            &format!("/api/v1/notices/{notice_id}"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK);
    });
}

#[test]
#[ignore = "requires postgres + redis; run via the integration workflow with `--ignored`"]
fn message_send_inbox_and_read() {
    rt().block_on(async {
        let token = login("demo", "admin", "Admin@123456").await;

        // baseline unread count for the demo admin
        let (status, body) = send(
            "GET",
            "/api/v1/my/messages/unread-count",
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let baseline = body["data"]["count"].as_u64().expect("count");

        // admin sends a message to itself (admin user id = 1002)
        let title = format!("测试消息 {}", uniq());
        let (status, body) = send(
            "POST",
            "/api/v1/messages",
            Some(&token),
            Some(json!({
                "title": title,
                "content": "正文内容",
                "msg_type": 2,
                "receiver_ids": ["1002"]
            })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let message_id = as_id(&body["data"]["id"]).expect("message id");

        // admin list shows recipient aggregates
        let (status, body) = send("GET", "/api/v1/messages", Some(&token), None).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert!(body["data"]["total"].as_u64().unwrap() >= 1);

        // unread count increased by one
        let (status, body) = send(
            "GET",
            "/api/v1/my/messages/unread-count",
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"]["count"].as_u64().unwrap(), baseline + 1);

        // inbox lists the new message as unread
        let (status, body) = send("GET", "/api/v1/my/messages", Some(&token), None).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let found = body["data"]["list"]
            .as_array()
            .expect("array")
            .iter()
            .find(|m| as_id(&m["message_id"]) == Some(message_id))
            .expect("message in inbox");
        assert_eq!(found["is_read"], false);

        // viewing the message marks it read and returns the content
        let (status, body) = send(
            "GET",
            &format!("/api/v1/my/messages/{message_id}"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"]["is_read"], true);
        assert_eq!(body["data"]["content"], "正文内容");

        // unread count is back to baseline
        let (status, body) = send(
            "GET",
            "/api/v1/my/messages/unread-count",
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"]["count"].as_u64().unwrap(), baseline);

        // mark-all-read is idempotent
        let (status, _) = send("PUT", "/api/v1/my/messages/read-all", Some(&token), None).await;
        assert_eq!(status, StatusCode::OK);

        // admin deletes the message
        let (status, _) = send(
            "DELETE",
            &format!("/api/v1/messages/{message_id}"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK);
    });
}

#[test]
#[ignore = "requires postgres + redis; run via the integration workflow with `--ignored`"]
fn job_create_run_and_logs() {
    rt().block_on(async {
        let token = login("demo", "admin", "Admin@123456").await;

        // create a paused job with a valid cron + known handler
        let name = format!("测试任务 {}", uniq());
        let (status, body) = send(
            "POST",
            "/api/v1/jobs",
            Some(&token),
            Some(json!({
                "name": name,
                "invoke_target": "demo:heartbeat",
                "cron_expr": "0 0/1 * * * *",
                "status": 0
            })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let job_id = as_id(&body["data"]["id"]).expect("job id");
        assert_eq!(body["data"]["status"], 0);

        // invalid cron expression is rejected
        let (status, _) = send(
            "POST",
            "/api/v1/jobs",
            Some(&token),
            Some(json!({
                "name": "坏任务",
                "invoke_target": "demo:heartbeat",
                "cron_expr": "not a cron"
            })),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);

        // enabling computes a next_run_at
        let (status, body) = send(
            "PUT",
            &format!("/api/v1/jobs/{job_id}/status"),
            Some(&token),
            Some(json!({ "status": 1 })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"]["status"], 1);
        assert!(body["data"]["next_run_at"].is_string());

        // manual run-once produces a successful log
        let (status, body) = send(
            "POST",
            &format!("/api/v1/jobs/{job_id}/run"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"]["status"], 1);
        assert_eq!(as_id(&body["data"]["job_id"]), Some(job_id));

        // the log is listed when filtered by job_id
        let (status, body) = send(
            "GET",
            &format!("/api/v1/job-logs?job_id={job_id}"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert!(body["data"]["total"].as_u64().unwrap() >= 1);

        // cleanup
        let (status, _) = send(
            "DELETE",
            &format!("/api/v1/jobs/{job_id}"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK);
    });
}

#[test]
#[ignore = "requires postgres + redis; run via the integration workflow with `--ignored`"]
fn gen_import_and_preview() {
    rt().block_on(async {
        let token = login("demo", "admin", "Admin@123456").await;

        // database tables are introspectable
        let (status, body) = send("GET", "/api/v1/gen/db-tables", Some(&token), None).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let tables = body["data"].as_array().expect("tables array");
        assert!(tables.iter().any(|t| t["table_name"] == "sys_post"));

        // import sys_post
        let (status, body) = send(
            "POST",
            "/api/v1/gen/import",
            Some(&token),
            Some(json!({ "table_names": ["sys_post"] })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");

        // importing a non-existent table is rejected
        let (status, _) = send(
            "POST",
            "/api/v1/gen/import",
            Some(&token),
            Some(json!({ "table_names": ["no_such_table"] })),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);

        // the imported config appears in the list
        let (status, body) = send("GET", "/api/v1/gen/tables", Some(&token), None).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let table_id = body["data"]["list"]
            .as_array()
            .expect("array")
            .iter()
            .find(|t| t["table_name"] == "sys_post")
            .and_then(|t| as_id(&t["id"]))
            .expect("imported table id");

        // detail returns columns with mapped types
        let (status, body) = send(
            "GET",
            &format!("/api/v1/gen/tables/{table_id}"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"]["table"]["class_name"], "Post");
        let columns = body["data"]["columns"].as_array().expect("columns");
        assert!(columns.iter().any(|c| c["column_name"] == "code"));

        // update the business name
        let (status, body) = send(
            "PUT",
            &format!("/api/v1/gen/tables/{table_id}"),
            Some(&token),
            Some(json!({ "function_name": "岗位" })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"]["table"]["function_name"], "岗位");

        // preview returns generated files for both backend and frontend
        let (status, body) = send(
            "GET",
            &format!("/api/v1/gen/tables/{table_id}/preview"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        let files = body["data"].as_array().expect("files array");
        assert!(files.len() >= 5);
        assert!(files
            .iter()
            .any(|f| f["path"].as_str().unwrap().ends_with("entity/src/post.rs")));
        assert!(files.iter().any(|f| f["path"]
            .as_str()
            .unwrap()
            .contains("web/src/features/post")));

        // cleanup
        let (status, _) = send(
            "DELETE",
            &format!("/api/v1/gen/tables/{table_id}"),
            Some(&token),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK);
    });
}
