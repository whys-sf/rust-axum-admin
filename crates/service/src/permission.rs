use casbin::{CoreApi, MgmtApi};
use common::AppResult;
use entity::prelude::*;
use sea_orm::{DatabaseConnection, EntityTrait};

use crate::SharedEnforcer;

/// Build the casbin domain string for a tenant.
fn dom(tenant_id: i64) -> String {
    tenant_id.to_string()
}

/// Replace all `p` policies of a role (within its tenant domain) with the given
/// API permissions. `apis` is a list of `(api_path, api_method)`.
pub async fn sync_role_policies(
    enforcer: &SharedEnforcer,
    tenant_id: i64,
    role_code: &str,
    apis: Vec<(String, String)>,
) -> AppResult<()> {
    let d = dom(tenant_id);
    let mut e = enforcer.write().await;

    e.remove_filtered_policy(0, vec![role_code.to_string(), d.clone()])
        .await?;

    if !apis.is_empty() {
        let rules: Vec<Vec<String>> = apis
            .into_iter()
            .map(|(path, method)| vec![role_code.to_string(), d.clone(), path, method])
            .collect();
        e.add_policies(rules).await?;
    }
    Ok(())
}

/// Remove every `p` policy of a role inside its tenant domain.
pub async fn remove_role_policies(
    enforcer: &SharedEnforcer,
    tenant_id: i64,
    role_code: &str,
) -> AppResult<()> {
    let d = dom(tenant_id);
    let mut e = enforcer.write().await;
    e.remove_filtered_policy(0, vec![role_code.to_string(), d])
        .await?;
    Ok(())
}

/// Replace all role bindings (`g`) of a user inside its tenant domain.
pub async fn sync_user_roles(
    enforcer: &SharedEnforcer,
    tenant_id: i64,
    user_id: i64,
    role_codes: &[String],
) -> AppResult<()> {
    let d = dom(tenant_id);
    let sub = user_id.to_string();
    let mut e = enforcer.write().await;

    // field index 0 = user, 2 = domain
    e.remove_filtered_grouping_policy(0, vec![sub.clone(), String::new(), d.clone()])
        .await?;

    if !role_codes.is_empty() {
        let rules: Vec<Vec<String>> = role_codes
            .iter()
            .map(|code| vec![sub.clone(), code.clone(), d.clone()])
            .collect();
        e.add_grouping_policies(rules).await?;
    }
    Ok(())
}

/// Remove every role binding of a user inside its tenant domain.
pub async fn remove_user(enforcer: &SharedEnforcer, tenant_id: i64, user_id: i64) -> AppResult<()> {
    let d = dom(tenant_id);
    let sub = user_id.to_string();
    let mut e = enforcer.write().await;
    e.remove_filtered_grouping_policy(0, vec![sub, String::new(), d])
        .await?;
    Ok(())
}

/// Check whether any of the caller's roles grant access to `(path, method)` in
/// the given tenant domain.
pub async fn enforce(
    enforcer: &SharedEnforcer,
    user_id: i64,
    tenant_id: i64,
    path: &str,
    method: &str,
) -> AppResult<bool> {
    let e = enforcer.read().await;
    let sub = user_id.to_string();
    let d = dom(tenant_id);
    let allowed = e.enforce((sub, d, path.to_string(), method.to_string()))?;
    Ok(allowed)
}

/// Rebuild the entire policy set from the database. Called on startup so the
/// casbin store always reflects the `sys_role_menu` / `sys_user_role` tables.
pub async fn rebuild_all(db: &DatabaseConnection, enforcer: &SharedEnforcer) -> AppResult<()> {
    let roles = Role::find().all(db).await?;
    let menus = Menu::find().all(db).await?;
    let role_menus = RoleMenu::find().all(db).await?;
    let user_roles = UserRole::find().all(db).await?;

    // menu_id -> (api_path, api_method) for menus that expose an API
    let menu_api: std::collections::HashMap<i64, (String, String)> = menus
        .iter()
        .filter_map(|m| match (&m.api_path, &m.api_method) {
            (Some(p), Some(method)) if !p.is_empty() && !method.is_empty() => {
                Some((m.id, (p.clone(), method.clone())))
            }
            _ => None,
        })
        .collect();

    // role_id -> role
    let role_by_id: std::collections::HashMap<i64, &entity::role::Model> =
        roles.iter().map(|r| (r.id, r)).collect();

    let mut p_rules: Vec<Vec<String>> = Vec::new();
    for rm in &role_menus {
        let Some(role) = role_by_id.get(&rm.role_id) else {
            continue;
        };
        if let Some((path, method)) = menu_api.get(&rm.menu_id) {
            p_rules.push(vec![
                role.code.clone(),
                dom(role.tenant_id),
                path.clone(),
                method.clone(),
            ]);
        }
    }

    let mut g_rules: Vec<Vec<String>> = Vec::new();
    for ur in &user_roles {
        if let Some(role) = role_by_id.get(&ur.role_id) {
            g_rules.push(vec![
                ur.user_id.to_string(),
                role.code.clone(),
                dom(role.tenant_id),
            ]);
        }
    }

    let mut e = enforcer.write().await;
    e.clear_policy().await?;
    if !p_rules.is_empty() {
        e.add_policies(p_rules).await?;
    }
    if !g_rules.is_empty() {
        e.add_grouping_policies(g_rules).await?;
    }
    tracing::info!("casbin policies rebuilt from database");
    Ok(())
}

#[cfg(test)]
mod tests {
    use casbin::{CoreApi, DefaultModel, Enforcer, MemoryAdapter, MgmtApi};

    #[tokio::test]
    async fn enforce_rbac_with_domains() {
        let model = DefaultModel::from_file("../../rbac_model.conf")
            .await
            .unwrap();
        let mut e = Enforcer::new(model, MemoryAdapter::default())
            .await
            .unwrap();
        e.add_policy(vec![
            "admin".into(),
            "1000".into(),
            "/api/v1/users".into(),
            "GET".into(),
        ])
        .await
        .unwrap();
        e.add_grouping_policy(vec!["1002".into(), "admin".into(), "1000".into()])
            .await
            .unwrap();
        let allowed = e
            .enforce((
                "1002".to_string(),
                "1000".to_string(),
                "/api/v1/users".to_string(),
                "GET".to_string(),
            ))
            .unwrap();
        assert!(allowed, "tenant admin should be allowed");
    }
}
