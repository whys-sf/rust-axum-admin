use std::str::FromStr;
use std::time::Duration;

use chrono::{DateTime, Utc};
use common::redis;
use common::response::PageResult;
use common::{AppError, AppResult};
use cron::Schedule;
use entity::prelude::*;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, Set,
};

use crate::dto::{CreateJobReq, CurrentUser, JobLogQuery, JobQuery, SetJobStatusReq, UpdateJobReq};
use crate::Services;

const SCHEDULER_LOCK: &str = "job_scheduler";
const SCHEDULER_LOCK_TTL_SECS: usize = 30;

/// Execute a named job handler. Returns a human-readable result on success or an
/// error message on failure. Extend this registry to wire real background work.
fn run_job_handler(target: &str) -> Result<String, String> {
    match target {
        "demo:heartbeat" => Ok("心跳正常".to_string()),
        "demo:cleanup" => Ok("清理完成（示例）".to_string()),
        other => Err(format!("未注册的任务处理器: {other}")),
    }
}

/// Parse a cron expression and return the next fire time strictly after `after`.
fn next_fire_after(cron_expr: &str, after: DateTime<Utc>) -> AppResult<Option<DateTime<Utc>>> {
    let schedule = Schedule::from_str(cron_expr)
        .map_err(|e| AppError::bad_request(format!("无效的 cron 表达式: {e}")))?;
    Ok(schedule.after(&after).next())
}

impl Services {
    pub async fn list_jobs(
        &self,
        current: &CurrentUser,
        query: JobQuery,
    ) -> AppResult<PageResult<entity::job::Model>> {
        let (page, page_size) = query.pagination().normalized();
        let mut select =
            Job::find().filter(entity::job::Column::TenantId.eq(current.acting_tenant()));
        if let Some(name) = query.name.filter(|s| !s.is_empty()) {
            select = select.filter(entity::job::Column::Name.contains(&name));
        }
        if let Some(status) = query.status {
            select = select.filter(entity::job::Column::Status.eq(status));
        }
        let paginator = select
            .order_by_desc(entity::job::Column::CreatedAt)
            .paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let list = paginator.fetch_page(page - 1).await?;
        Ok(PageResult::new(list, total, page, page_size))
    }

    async fn find_job_scoped(
        &self,
        current: &CurrentUser,
        id: i64,
    ) -> AppResult<entity::job::Model> {
        Job::find_by_id(id)
            .filter(entity::job::Column::TenantId.eq(current.acting_tenant()))
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("任务不存在"))
    }

    pub async fn get_job(&self, current: &CurrentUser, id: i64) -> AppResult<entity::job::Model> {
        self.find_job_scoped(current, id).await
    }

    pub async fn create_job(
        &self,
        current: &CurrentUser,
        req: CreateJobReq,
    ) -> AppResult<entity::job::Model> {
        let now = Utc::now();
        let status = req.status.unwrap_or(0);
        let next_run_at = if status == 1 {
            next_fire_after(&req.cron_expr, now)?
        } else {
            // still validate the expression even when paused.
            next_fire_after(&req.cron_expr, now)?;
            None
        };
        let model = entity::job::ActiveModel {
            id: Set(self.next_id()),
            tenant_id: Set(current.acting_tenant()),
            name: Set(req.name),
            job_group: Set(req.job_group.unwrap_or_else(|| "default".to_string())),
            invoke_target: Set(req.invoke_target),
            cron_expr: Set(req.cron_expr),
            status: Set(status),
            remark: Set(req.remark),
            last_run_at: Set(None),
            next_run_at: Set(next_run_at),
            created_at: Set(now),
            updated_at: Set(now),
        };
        Ok(model.insert(&self.db).await?)
    }

    pub async fn update_job(
        &self,
        current: &CurrentUser,
        id: i64,
        req: UpdateJobReq,
    ) -> AppResult<entity::job::Model> {
        let model = self.find_job_scoped(current, id).await?;
        let now = Utc::now();
        let cron_expr = req
            .cron_expr
            .clone()
            .unwrap_or_else(|| model.cron_expr.clone());
        let status = req.status.unwrap_or(model.status);

        let mut active: entity::job::ActiveModel = model.into();
        if let Some(name) = req.name {
            active.name = Set(name);
        }
        if let Some(group) = req.job_group {
            active.job_group = Set(group);
        }
        if let Some(target) = req.invoke_target {
            active.invoke_target = Set(target);
        }
        if req.cron_expr.is_some() {
            active.cron_expr = Set(cron_expr.clone());
        }
        if req.status.is_some() {
            active.status = Set(status);
        }
        if let Some(remark) = req.remark {
            active.remark = Set(Some(remark));
        }
        // recompute the next fire time from the resulting cron + status.
        active.next_run_at = Set(if status == 1 {
            next_fire_after(&cron_expr, now)?
        } else {
            next_fire_after(&cron_expr, now)?;
            None
        });
        active.updated_at = Set(now);
        Ok(active.update(&self.db).await?)
    }

    pub async fn set_job_status(
        &self,
        current: &CurrentUser,
        id: i64,
        req: SetJobStatusReq,
    ) -> AppResult<entity::job::Model> {
        let model = self.find_job_scoped(current, id).await?;
        let now = Utc::now();
        let next = if req.status == 1 {
            next_fire_after(&model.cron_expr, now)?
        } else {
            None
        };
        let mut active: entity::job::ActiveModel = model.into();
        active.status = Set(req.status);
        active.next_run_at = Set(next);
        active.updated_at = Set(now);
        Ok(active.update(&self.db).await?)
    }

    pub async fn delete_job(&self, current: &CurrentUser, id: i64) -> AppResult<()> {
        self.find_job_scoped(current, id).await?;
        JobLog::delete_many()
            .filter(entity::job_log::Column::JobId.eq(id))
            .filter(entity::job_log::Column::TenantId.eq(current.acting_tenant()))
            .exec(&self.db)
            .await?;
        Job::delete_by_id(id)
            .filter(entity::job::Column::TenantId.eq(current.acting_tenant()))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    /// Manually trigger a job once (ignores its schedule) and record a log row.
    pub async fn run_job_once(
        &self,
        current: &CurrentUser,
        id: i64,
    ) -> AppResult<entity::job_log::Model> {
        let job = self.find_job_scoped(current, id).await?;
        self.execute_job(&job).await
    }

    pub async fn list_job_logs(
        &self,
        current: &CurrentUser,
        query: JobLogQuery,
    ) -> AppResult<PageResult<entity::job_log::Model>> {
        let (page, page_size) = query.pagination().normalized();
        let mut select =
            JobLog::find().filter(entity::job_log::Column::TenantId.eq(current.acting_tenant()));
        if let Some(job_id) = query.job_id {
            select = select.filter(entity::job_log::Column::JobId.eq(job_id));
        }
        if let Some(status) = query.status {
            select = select.filter(entity::job_log::Column::Status.eq(status));
        }
        let paginator = select
            .order_by_desc(entity::job_log::Column::StartedAt)
            .paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let list = paginator.fetch_page(page - 1).await?;
        Ok(PageResult::new(list, total, page, page_size))
    }

    /// Run a job's handler and persist a `sys_job_log` row. Used by both the
    /// manual trigger and the background scheduler.
    async fn execute_job(&self, job: &entity::job::Model) -> AppResult<entity::job_log::Model> {
        let started_at = Utc::now();
        let result = run_job_handler(&job.invoke_target);
        let duration_ms = (Utc::now() - started_at).num_milliseconds().max(0);
        let (status, message) = match result {
            Ok(msg) => (1i16, msg),
            Err(err) => (0i16, err),
        };
        let log = entity::job_log::ActiveModel {
            id: Set(self.next_id()),
            tenant_id: Set(job.tenant_id),
            job_id: Set(job.id),
            job_name: Set(job.name.clone()),
            invoke_target: Set(job.invoke_target.clone()),
            status: Set(status),
            message: Set(message),
            started_at: Set(started_at),
            duration_ms: Set(duration_ms),
            created_at: Set(Utc::now()),
        };
        Ok(log.insert(&self.db).await?)
    }

    /// Find every enabled job whose `next_run_at` is due, execute it, and advance
    /// its schedule. Returns the number of jobs fired (handy for tests).
    pub async fn tick_due_jobs(&self) -> AppResult<usize> {
        let now = Utc::now();
        let due = Job::find()
            .filter(entity::job::Column::Status.eq(1))
            .filter(entity::job::Column::NextRunAt.lte(now))
            .all(&self.db)
            .await?;
        let count = due.len();
        for job in due {
            if let Err(err) = self.execute_job(&job).await {
                tracing::error!(job_id = job.id, error = %err, "job execution failed");
            }
            let next = next_fire_after(&job.cron_expr, now).ok().flatten();
            let mut active: entity::job::ActiveModel = job.into();
            active.last_run_at = Set(Some(now));
            active.next_run_at = Set(next);
            active.updated_at = Set(Utc::now());
            if let Err(err) = active.update(&self.db).await {
                tracing::error!(error = %err, "failed to advance job schedule");
            }
        }
        Ok(count)
    }
}

/// Background scheduler loop: every 5s, fire any due jobs. Spawn this once at
/// startup. It runs across all tenants since it is a system-level process.
pub async fn run_scheduler(services: Services) {
    let mut interval = tokio::time::interval(Duration::from_secs(5));
    loop {
        interval.tick().await;
        let token =
            match redis::try_acquire_lock(&services.redis, SCHEDULER_LOCK, SCHEDULER_LOCK_TTL_SECS)
                .await
            {
                Ok(Some(token)) => token,
                Ok(None) => continue,
                Err(err) => {
                    tracing::warn!(error = %err, "failed to acquire scheduler lock");
                    continue;
                }
            };

        if let Err(err) = services.tick_due_jobs().await {
            tracing::error!(error = %err, "scheduler tick failed");
        }
        if let Err(err) = redis::release_lock(&services.redis, SCHEDULER_LOCK, &token).await {
            tracing::warn!(error = %err, "failed to release scheduler lock");
        }
    }
}
