use std::collections::HashMap;

use chrono::Utc;
use common::{AppError, AppResult};
use entity::prelude::*;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};

use crate::dto::{AppSettings, CurrentUser, UpdateSettingsReq};
use crate::{Services, PLATFORM_TENANT_ID};

impl Services {
    /// Read config rows into a key -> value map for one tenant scope.
    async fn settings_map(&self, tenant_id: i64) -> AppResult<HashMap<String, String>> {
        Ok(Config::find()
            .filter(entity::config::Column::TenantId.eq(tenant_id))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|c| (c.config_key, c.config_value))
            .collect())
    }

    fn build_settings(&self, map: HashMap<String, String>) -> AppSettings {
        let get = |k: &str| map.get(k).cloned().unwrap_or_default();
        AppSettings {
            site_name: get("site_name"),
            login_title: get("login_title"),
            login_subtitle: get("login_subtitle"),
            login_background: get("login_background"),
            logo_url: get("logo_url"),
            tenant_mode: if self.settings.tenant.is_single() {
                "single".to_string()
            } else {
                "multi".to_string()
            },
            show_tenant_login: self.settings.tenant.is_multi()
                || self.settings.tenant.show_tenant_login,
            enable_platform_console: self.settings.tenant.enable_platform_console,
        }
    }

    /// Public settings are platform-level branding for the shared login entry.
    pub async fn public_settings(&self) -> AppResult<AppSettings> {
        Ok(self.build_settings(self.settings_map(PLATFORM_TENANT_ID).await?))
    }

    /// Login/branding settings are platform-level. Tenant admins may read them
    /// for display, but only platform admins can update them.
    pub async fn get_settings(&self, current: &CurrentUser) -> AppResult<AppSettings> {
        let _ = current;
        Ok(self.build_settings(self.settings_map(PLATFORM_TENANT_ID).await?))
    }

    /// Upsert only the provided fields, then return the full settings.
    pub async fn update_settings(
        &self,
        current: &CurrentUser,
        req: UpdateSettingsReq,
    ) -> AppResult<AppSettings> {
        if !current.is_platform {
            return Err(AppError::Forbidden);
        }
        let changes = [
            ("site_name", req.site_name),
            ("login_title", req.login_title),
            ("login_subtitle", req.login_subtitle),
            ("login_background", req.login_background),
            ("logo_url", req.logo_url),
        ];
        for (key, value) in changes {
            let Some(value) = value else { continue };
            self.upsert_config(PLATFORM_TENANT_ID, key, value).await?;
        }
        self.get_settings(current).await
    }

    async fn upsert_config(&self, tenant_id: i64, key: &str, value: String) -> AppResult<()> {
        let now = Utc::now();
        match Config::find_by_id((tenant_id, key.to_string()))
            .one(&self.db)
            .await?
        {
            Some(existing) => {
                let mut active: entity::config::ActiveModel = existing.into();
                active.config_value = Set(value);
                active.updated_at = Set(now);
                active.update(&self.db).await?;
            }
            None => {
                entity::config::ActiveModel {
                    tenant_id: Set(tenant_id),
                    config_key: Set(key.to_string()),
                    config_value: Set(value),
                    updated_at: Set(now),
                }
                .insert(&self.db)
                .await?;
            }
        }
        Ok(())
    }
}
