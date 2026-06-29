use std::collections::BTreeSet;

use common::{AppError, AppResult};
use entity::prelude::*;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};

use crate::dto::CurrentUser;
use crate::{Services, PLATFORM_TENANT_ID};

impl Services {
    async fn all_enabled_feature_codes(&self) -> AppResult<BTreeSet<String>> {
        Ok(Feature::find()
            .filter(entity::feature::Column::Status.eq(1))
            .order_by_asc(entity::feature::Column::Sort)
            .order_by_asc(entity::feature::Column::Code)
            .all(&self.db)
            .await?
            .into_iter()
            .map(|f| f.code)
            .collect())
    }

    async fn package_feature_codes(&self, package_id: i64) -> AppResult<BTreeSet<String>> {
        let package = Package::find_by_id(package_id)
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("套餐不存在"))?;
        if package.status != 1 {
            return Ok(BTreeSet::new());
        }

        let package_features = PackageFeature::find()
            .filter(entity::package_feature::Column::PackageId.eq(package_id))
            .all(&self.db)
            .await?;
        if package_features.is_empty() {
            return Ok(BTreeSet::new());
        }
        let codes: Vec<String> = package_features
            .into_iter()
            .map(|pf| pf.feature_code)
            .collect();

        Ok(Feature::find()
            .filter(entity::feature::Column::Status.eq(1))
            .filter(entity::feature::Column::Code.is_in(codes))
            .order_by_asc(entity::feature::Column::Sort)
            .order_by_asc(entity::feature::Column::Code)
            .all(&self.db)
            .await?
            .into_iter()
            .map(|f| f.code)
            .collect())
    }

    /// Feature codes available to the current tenant. A tenant without a bound
    /// package keeps all enabled features for backward compatibility.
    pub async fn tenant_feature_codes(&self, current: &CurrentUser) -> AppResult<Vec<String>> {
        let mut features = if current.is_platform || current.acting_tenant() == PLATFORM_TENANT_ID {
            self.all_enabled_feature_codes().await?
        } else {
            let tenant = Tenant::find_by_id(current.acting_tenant())
                .one(&self.db)
                .await?
                .ok_or_else(|| AppError::not_found("租户不存在"))?;
            match tenant.package_id {
                Some(package_id) => self.package_feature_codes(package_id).await?,
                None => self.all_enabled_feature_codes().await?,
            }
        };

        let overrides = TenantFeature::find()
            .filter(entity::tenant_feature::Column::TenantId.eq(current.acting_tenant()))
            .all(&self.db)
            .await?;
        for item in overrides {
            if item.enabled {
                features.insert(item.feature_code);
            } else {
                features.remove(&item.feature_code);
            }
        }

        Ok(features.into_iter().collect())
    }

    pub async fn is_feature_enabled(&self, current: &CurrentUser, code: &str) -> AppResult<bool> {
        Ok(self
            .tenant_feature_codes(current)
            .await?
            .iter()
            .any(|feature| feature == code))
    }
}
