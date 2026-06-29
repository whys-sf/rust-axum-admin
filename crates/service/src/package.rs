use std::collections::HashSet;

use chrono::Utc;
use common::{AppError, AppResult};
use entity::prelude::*;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set, TransactionTrait,
};

use crate::dto::{CreatePackageReq, PackageResp, UpdatePackageReq};
use crate::Services;

impl Services {
    pub async fn list_features(&self) -> AppResult<Vec<entity::feature::Model>> {
        Ok(Feature::find()
            .order_by_asc(entity::feature::Column::Sort)
            .order_by_asc(entity::feature::Column::Id)
            .all(&self.db)
            .await?)
    }

    pub async fn list_packages(&self) -> AppResult<Vec<PackageResp>> {
        let packages = Package::find()
            .order_by_asc(entity::package::Column::Sort)
            .order_by_desc(entity::package::Column::CreatedAt)
            .all(&self.db)
            .await?;

        let mut result = Vec::with_capacity(packages.len());
        for package in packages {
            result.push(self.package_resp(package).await?);
        }
        Ok(result)
    }

    pub async fn create_package(&self, req: CreatePackageReq) -> AppResult<PackageResp> {
        let dup = Package::find()
            .filter(entity::package::Column::Code.eq(&req.code))
            .one(&self.db)
            .await?
            .is_some();
        if dup {
            return Err(AppError::conflict("套餐编码已存在"));
        }
        self.validate_feature_codes(&req.feature_codes).await?;

        let now = Utc::now();
        let package_id = self.next_id();
        let txn = self.db.begin().await?;
        let package = entity::package::ActiveModel {
            id: Set(package_id),
            code: Set(req.code),
            name: Set(req.name),
            description: Set(req.description),
            status: Set(req.status.unwrap_or(1)),
            sort: Set(req.sort.unwrap_or(0)),
            default_user_limit: Set(req.default_user_limit.unwrap_or(0).max(0)),
            created_at: Set(now),
            updated_at: Set(now),
        }
        .insert(&txn)
        .await?;
        self.replace_package_features_in_tx(&txn, package_id, &req.feature_codes)
            .await?;
        txn.commit().await?;
        self.package_resp(package).await
    }

    pub async fn update_package(&self, id: i64, req: UpdatePackageReq) -> AppResult<PackageResp> {
        if let Some(codes) = &req.feature_codes {
            self.validate_feature_codes(codes).await?;
        }

        let package = Package::find_by_id(id)
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("套餐不存在"))?;
        let mut active: entity::package::ActiveModel = package.into();
        if let Some(v) = req.name {
            active.name = Set(v);
        }
        if req.description.is_some() {
            active.description = Set(req.description);
        }
        if let Some(v) = req.status {
            active.status = Set(v);
        }
        if let Some(v) = req.sort {
            active.sort = Set(v);
        }
        if let Some(v) = req.default_user_limit {
            active.default_user_limit = Set(v.max(0));
        }
        active.updated_at = Set(Utc::now());

        let txn = self.db.begin().await?;
        let package = active.update(&txn).await?;
        if let Some(codes) = req.feature_codes {
            self.replace_package_features_in_tx(&txn, id, &codes)
                .await?;
        }
        txn.commit().await?;
        self.package_resp(package).await
    }

    pub async fn delete_package(&self, id: i64) -> AppResult<()> {
        let used = Tenant::find()
            .filter(entity::tenant::Column::PackageId.eq(id))
            .one(&self.db)
            .await?
            .is_some();
        if used {
            return Err(AppError::bad_request("已有租户绑定该套餐，不能删除"));
        }

        let txn = self.db.begin().await?;
        PackageFeature::delete_many()
            .filter(entity::package_feature::Column::PackageId.eq(id))
            .exec(&txn)
            .await?;
        let result = Package::delete_by_id(id).exec(&txn).await?;
        if result.rows_affected == 0 {
            return Err(AppError::not_found("套餐不存在"));
        }
        txn.commit().await?;
        Ok(())
    }

    async fn package_resp(&self, package: entity::package::Model) -> AppResult<PackageResp> {
        let feature_codes = PackageFeature::find()
            .filter(entity::package_feature::Column::PackageId.eq(package.id))
            .order_by_asc(entity::package_feature::Column::FeatureCode)
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.feature_code)
            .collect();
        Ok(PackageResp {
            id: package.id,
            code: package.code,
            name: package.name,
            description: package.description,
            status: package.status,
            sort: package.sort,
            default_user_limit: package.default_user_limit,
            feature_codes,
            created_at: package.created_at,
            updated_at: package.updated_at,
        })
    }

    async fn validate_feature_codes(&self, codes: &[String]) -> AppResult<()> {
        let requested: HashSet<String> = codes.iter().map(|v| v.trim().to_string()).collect();
        if requested.iter().any(|v| v.is_empty()) {
            return Err(AppError::bad_request("功能编码不能为空"));
        }
        let existing: HashSet<String> = Feature::find()
            .filter(entity::feature::Column::Code.is_in(requested.clone()))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.code)
            .collect();
        let missing: Vec<String> = requested
            .difference(&existing)
            .map(|v| v.to_string())
            .collect();
        if !missing.is_empty() {
            return Err(AppError::bad_request(format!(
                "功能不存在: {}",
                missing.join(", ")
            )));
        }
        Ok(())
    }

    async fn replace_package_features_in_tx<C>(
        &self,
        conn: &C,
        package_id: i64,
        codes: &[String],
    ) -> AppResult<()>
    where
        C: sea_orm::ConnectionTrait,
    {
        PackageFeature::delete_many()
            .filter(entity::package_feature::Column::PackageId.eq(package_id))
            .exec(conn)
            .await?;
        let rows: Vec<entity::package_feature::ActiveModel> = codes
            .iter()
            .map(|code| code.trim())
            .filter(|code| !code.is_empty())
            .collect::<HashSet<_>>()
            .into_iter()
            .map(|code| entity::package_feature::ActiveModel {
                package_id: Set(package_id),
                feature_code: Set(code.to_string()),
            })
            .collect();
        if !rows.is_empty() {
            PackageFeature::insert_many(rows).exec(conn).await?;
        }
        Ok(())
    }
}
