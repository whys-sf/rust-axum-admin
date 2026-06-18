use chrono::Utc;
use common::config::StorageConfig;
use common::response::PageResult;
use common::{AppError, AppResult};
use entity::prelude::*;
use s3::creds::Credentials;
use s3::{Bucket, BucketConfiguration, Region};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, Set,
};

use crate::dto::{CurrentUser, FileContent, FileQuery, FileView};
use crate::Services;

fn s3_err(e: impl std::error::Error + Send + Sync + 'static) -> AppError {
    AppError::Other(anyhow::Error::new(e))
}

impl Services {
    /// Build an S3 (MinIO) client from configuration. Cheap: holds config only,
    /// no persistent connection.
    fn storage_bucket(&self) -> AppResult<Box<Bucket>> {
        let cfg: &StorageConfig = &self.settings.storage;
        let region = Region::Custom {
            region: cfg.region.clone(),
            endpoint: cfg.endpoint.clone(),
        };
        let creds = Credentials::new(
            Some(&cfg.access_key),
            Some(&cfg.secret_key),
            None,
            None,
            None,
        )
        .map_err(s3_err)?;
        let bucket = Bucket::new(&cfg.bucket, region, creds).map_err(s3_err)?;
        if cfg.path_style {
            Ok(bucket.with_path_style())
        } else {
            Ok(bucket)
        }
    }

    /// Create the configured bucket if it does not exist. Best-effort: logs a
    /// warning and returns if storage is unreachable, so the app still boots
    /// when MinIO is down (file endpoints will then error per-request).
    pub async fn ensure_storage_bucket(&self) {
        let cfg = self.settings.storage.clone();
        let bucket = match self.storage_bucket() {
            Ok(b) => b,
            Err(e) => {
                tracing::warn!(error = %e, "invalid storage config; skipping bucket init");
                return;
            }
        };
        match bucket.exists().await {
            Ok(true) => {
                tracing::debug!(bucket = %cfg.bucket, "storage bucket already exists");
                return;
            }
            Ok(false) => {}
            Err(e) => {
                tracing::warn!(error = %e, bucket = %cfg.bucket, "storage unreachable; skipping bucket init");
                return;
            }
        }
        let region = Region::Custom {
            region: cfg.region.clone(),
            endpoint: cfg.endpoint.clone(),
        };
        let creds = match Credentials::new(
            Some(&cfg.access_key),
            Some(&cfg.secret_key),
            None,
            None,
            None,
        ) {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!(error = %e, "invalid storage credentials; skipping bucket init");
                return;
            }
        };
        match Bucket::create_with_path_style(
            &cfg.bucket,
            region,
            creds,
            BucketConfiguration::default(),
        )
        .await
        {
            Ok(resp) if resp.success() => {
                tracing::info!(bucket = %cfg.bucket, "created storage bucket")
            }
            Ok(resp) => tracing::warn!(
                bucket = %cfg.bucket,
                code = resp.response_code,
                text = %resp.response_text,
                "bucket creation returned non-success"
            ),
            Err(e) => {
                tracing::warn!(error = %e, bucket = %cfg.bucket, "could not create storage bucket")
            }
        }
    }

    pub async fn upload_file(
        &self,
        current: &CurrentUser,
        original_name: String,
        content_type: String,
        data: Vec<u8>,
        is_public: bool,
    ) -> AppResult<FileView> {
        if data.is_empty() {
            return Err(AppError::bad_request("空文件"));
        }
        let id = self.next_id();
        let tenant_id = current.acting_tenant();
        let ext = std::path::Path::new(&original_name)
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| format!(".{}", e.to_lowercase()))
            .unwrap_or_default();
        let object_key = format!("{tenant_id}/{id}{ext}");

        let bucket = self.storage_bucket()?;
        let resp = bucket
            .put_object_with_content_type(&object_key, &data, &content_type)
            .await
            .map_err(s3_err)?;
        if !(200..300).contains(&resp.status_code()) {
            return Err(AppError::Other(anyhow::anyhow!(
                "对象存储写入失败 (HTTP {})",
                resp.status_code()
            )));
        }

        let model = entity::file::ActiveModel {
            id: Set(id),
            tenant_id: Set(tenant_id),
            original_name: Set(original_name),
            object_key: Set(object_key),
            content_type: Set(content_type),
            size: Set(data.len() as i64),
            is_public: Set(is_public),
            created_by: Set(current.id),
            created_at: Set(Utc::now()),
        }
        .insert(&self.db)
        .await?;
        Ok(FileView::new(model))
    }

    pub async fn list_files(
        &self,
        current: &CurrentUser,
        query: FileQuery,
    ) -> AppResult<PageResult<FileView>> {
        let (page, page_size) = query.pagination().normalized();
        let mut select =
            File::find().filter(entity::file::Column::TenantId.eq(current.acting_tenant()));
        if let Some(name) = query.original_name.filter(|s| !s.is_empty()) {
            select = select.filter(entity::file::Column::OriginalName.contains(&name));
        }
        let paginator = select
            .order_by_desc(entity::file::Column::CreatedAt)
            .paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let list = paginator.fetch_page(page - 1).await?;
        let views = list.into_iter().map(FileView::new).collect();
        Ok(PageResult::new(views, total, page, page_size))
    }

    async fn find_file_scoped(
        &self,
        current: &CurrentUser,
        id: i64,
    ) -> AppResult<entity::file::Model> {
        File::find_by_id(id)
            .filter(entity::file::Column::TenantId.eq(current.acting_tenant()))
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("文件不存在"))
    }

    pub async fn delete_file(&self, current: &CurrentUser, id: i64) -> AppResult<()> {
        let file = self.find_file_scoped(current, id).await?;
        let bucket = self.storage_bucket()?;
        // best-effort object removal; the row is the source of truth.
        if let Err(e) = bucket.delete_object(&file.object_key).await {
            tracing::warn!(error = %e, key = %file.object_key, "failed to delete object from storage");
        }
        File::delete_by_id(id)
            .filter(entity::file::Column::TenantId.eq(current.acting_tenant()))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    async fn fetch_object(&self, file: &entity::file::Model) -> AppResult<FileContent> {
        let bucket = self.storage_bucket()?;
        let resp = bucket.get_object(&file.object_key).await.map_err(s3_err)?;
        if !(200..300).contains(&resp.status_code()) {
            return Err(AppError::not_found("文件内容不存在"));
        }
        Ok(FileContent {
            original_name: file.original_name.clone(),
            content_type: file.content_type.clone(),
            bytes: resp.bytes().to_vec(),
        })
    }

    pub async fn download_file(&self, current: &CurrentUser, id: i64) -> AppResult<FileContent> {
        let file = self.find_file_scoped(current, id).await?;
        self.fetch_object(&file).await
    }

    /// Fetch a public file without authentication (used for logos / login
    /// backgrounds). Only files flagged `is_public` are served.
    pub async fn public_file(&self, id: i64) -> AppResult<FileContent> {
        let file = File::find_by_id(id)
            .filter(entity::file::Column::IsPublic.eq(true))
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("文件不存在"))?;
        self.fetch_object(&file).await
    }
}
