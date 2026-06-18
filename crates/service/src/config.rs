use std::collections::HashMap;

use chrono::Utc;
use common::AppResult;
use entity::prelude::*;
use sea_orm::{ActiveModelTrait, EntityTrait, Set};

use crate::dto::{AppSettings, UpdateSettingsReq};
use crate::Services;

impl Services {
    /// Read every config row into a key -> value map.
    async fn settings_map(&self) -> AppResult<HashMap<String, String>> {
        Ok(Config::find()
            .all(&self.db)
            .await?
            .into_iter()
            .map(|c| (c.config_key, c.config_value))
            .collect())
    }

    /// The public-facing site settings (consumed by the login page and the
    /// settings admin form alike).
    pub async fn get_settings(&self) -> AppResult<AppSettings> {
        let map = self.settings_map().await?;
        let get = |k: &str| map.get(k).cloned().unwrap_or_default();
        Ok(AppSettings {
            site_name: get("site_name"),
            login_title: get("login_title"),
            login_subtitle: get("login_subtitle"),
            login_background: get("login_background"),
            logo_url: get("logo_url"),
        })
    }

    /// Upsert only the provided fields, then return the full settings.
    pub async fn update_settings(&self, req: UpdateSettingsReq) -> AppResult<AppSettings> {
        let changes = [
            ("site_name", req.site_name),
            ("login_title", req.login_title),
            ("login_subtitle", req.login_subtitle),
            ("login_background", req.login_background),
            ("logo_url", req.logo_url),
        ];
        for (key, value) in changes {
            let Some(value) = value else { continue };
            self.upsert_config(key, value).await?;
        }
        self.get_settings().await
    }

    async fn upsert_config(&self, key: &str, value: String) -> AppResult<()> {
        let now = Utc::now();
        match Config::find_by_id(key.to_string()).one(&self.db).await? {
            Some(existing) => {
                let mut active: entity::config::ActiveModel = existing.into();
                active.config_value = Set(value);
                active.updated_at = Set(now);
                active.update(&self.db).await?;
            }
            None => {
                entity::config::ActiveModel {
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
