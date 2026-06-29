use chrono::Utc;
use common::response::PageResult;
use common::{AppError, AppResult};
use entity::prelude::*;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbBackend, EntityTrait, PaginatorTrait,
    QueryFilter, QueryOrder, Set, Statement, TransactionTrait,
};

use crate::dto::{
    CurrentUser, DbTableInfo, GenFile, GenTableDetail, GenTableQuery, ImportTablesReq,
    UpdateGenTableReq,
};
use crate::Services;

mod template;

/// Strip a common table prefix (`sys_`, `t_`, `tbl_`) and return
/// `(class_name PascalCase, module_name snake_case)`.
fn derive_names(table_name: &str) -> (String, String) {
    let module = table_name
        .strip_prefix("sys_")
        .or_else(|| table_name.strip_prefix("tbl_"))
        .or_else(|| table_name.strip_prefix("t_"))
        .unwrap_or(table_name)
        .to_string();
    (to_pascal(&module), module)
}

fn to_pascal(snake: &str) -> String {
    snake
        .split('_')
        .filter(|s| !s.is_empty())
        .map(|seg| {
            let mut chars = seg.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect()
}

/// Map a PostgreSQL type (from `format_type`) to `(rust_type, ts_type)`.
/// `bigint` columns map to `String` on the TS side per the snowflake-ID convention.
fn map_types(data_type: &str, nullable: bool) -> (String, String) {
    let dt = data_type.to_lowercase();
    let (rust_base, ts_type): (&str, &str) = if dt.starts_with("bigint") {
        ("i64", "string")
    } else if dt.starts_with("integer") || dt.starts_with("int4") {
        ("i32", "number")
    } else if dt.starts_with("smallint") || dt.starts_with("int2") {
        ("i16", "number")
    } else if dt.starts_with("boolean") {
        ("bool", "boolean")
    } else if dt.starts_with("timestamp") {
        ("DateTime<Utc>", "string")
    } else if dt.starts_with("date") {
        ("NaiveDate", "string")
    } else if dt.starts_with("numeric")
        || dt.starts_with("double")
        || dt.starts_with("real")
        || dt.starts_with("decimal")
    {
        ("f64", "number")
    } else if dt.starts_with("json") {
        ("serde_json::Value", "unknown")
    } else {
        ("String", "string")
    };
    let rust_type = if nullable {
        format!("Option<{rust_base}>")
    } else {
        rust_base.to_string()
    };
    (rust_type, ts_type.to_string())
}

struct RawColumn {
    name: String,
    data_type: String,
    nullable: bool,
    comment: String,
    is_pk: bool,
}

impl Services {
    async fn raw_table_names(&self) -> AppResult<Vec<(String, String)>> {
        let rows = self
            .db
            .query_all(Statement::from_string(
                DbBackend::Postgres,
                "SELECT c.relname AS table_name, COALESCE(obj_description(c.oid), '') AS comment \
                 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace \
                 WHERE n.nspname = 'public' AND c.relkind = 'r' \
                 ORDER BY c.relname"
                    .to_string(),
            ))
            .await?;
        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            let name: String = row.try_get("", "table_name")?;
            let comment: String = row.try_get("", "comment")?;
            out.push((name, comment));
        }
        Ok(out)
    }

    async fn raw_columns(&self, table_name: &str) -> AppResult<Vec<RawColumn>> {
        let cols = self
            .db
            .query_all(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT a.attname AS column_name, \
                    format_type(a.atttypid, a.atttypmod) AS data_type, \
                    (NOT a.attnotnull) AS is_nullable, \
                    COALESCE(col_description(c.oid, a.attnum), '') AS comment \
                 FROM pg_class c \
                 JOIN pg_namespace n ON n.oid = c.relnamespace \
                 JOIN pg_attribute a ON a.attrelid = c.oid \
                 WHERE n.nspname = 'public' AND c.relname = $1 \
                    AND a.attnum > 0 AND NOT a.attisdropped \
                 ORDER BY a.attnum",
                [table_name.into()],
            ))
            .await?;
        if cols.is_empty() {
            return Err(AppError::not_found("数据表不存在或无列"));
        }
        let pk_rows = self
            .db
            .query_all(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT a.attname AS column_name FROM pg_index i \
                 JOIN pg_class c ON c.oid = i.indrelid \
                 JOIN pg_namespace n ON n.oid = c.relnamespace \
                 JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey) \
                 WHERE n.nspname = 'public' AND c.relname = $1 AND i.indisprimary",
                [table_name.into()],
            ))
            .await?;
        let mut pks = std::collections::HashSet::new();
        for row in pk_rows {
            pks.insert(row.try_get::<String>("", "column_name")?);
        }
        let mut out = Vec::with_capacity(cols.len());
        for row in cols {
            let name: String = row.try_get("", "column_name")?;
            let data_type: String = row.try_get("", "data_type")?;
            let nullable: bool = row.try_get("", "is_nullable")?;
            let comment: String = row.try_get("", "comment")?;
            let is_pk = pks.contains(&name);
            out.push(RawColumn {
                name,
                data_type,
                nullable,
                comment,
                is_pk,
            });
        }
        Ok(out)
    }

    /// List physical tables in the database, flagging which are already imported.
    pub async fn list_db_tables(&self, current: &CurrentUser) -> AppResult<Vec<DbTableInfo>> {
        let tables = self.raw_table_names().await?;
        let imported: std::collections::HashSet<String> = GenTable::find()
            .filter(entity::gen_table::Column::TenantId.eq(current.acting_tenant()))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|t| t.table_name)
            .collect();
        Ok(tables
            .into_iter()
            .map(|(table_name, comment)| DbTableInfo {
                imported: imported.contains(&table_name),
                table_name,
                comment,
            })
            .collect())
    }

    pub async fn list_gen_tables(
        &self,
        current: &CurrentUser,
        query: GenTableQuery,
    ) -> AppResult<PageResult<entity::gen_table::Model>> {
        let (page, page_size) = query.pagination().normalized();
        let mut select = GenTable::find()
            .filter(entity::gen_table::Column::TenantId.eq(current.acting_tenant()));
        if let Some(name) = query.table_name.filter(|s| !s.is_empty()) {
            select = select.filter(entity::gen_table::Column::TableName.contains(&name));
        }
        let paginator = select
            .order_by_desc(entity::gen_table::Column::CreatedAt)
            .paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let list = paginator.fetch_page(page - 1).await?;
        Ok(PageResult::new(list, total, page, page_size))
    }

    /// Import one or more physical tables, persisting their column metadata.
    pub async fn import_tables(
        &self,
        current: &CurrentUser,
        req: ImportTablesReq,
    ) -> AppResult<u64> {
        let tenant_id = current.acting_tenant();
        let available: std::collections::HashSet<String> = self
            .raw_table_names()
            .await?
            .into_iter()
            .map(|(name, _)| name)
            .collect();

        let txn = self.db.begin().await?;
        let mut imported = 0u64;
        for table_name in req.table_names {
            if !available.contains(&table_name) {
                return Err(AppError::bad_request(format!("数据表不存在: {table_name}")));
            }
            let exists = GenTable::find()
                .filter(entity::gen_table::Column::TenantId.eq(tenant_id))
                .filter(entity::gen_table::Column::TableName.eq(&table_name))
                .one(&txn)
                .await?
                .is_some();
            if exists {
                continue;
            }
            let columns = self.raw_columns(&table_name).await?;
            let (class_name, module_name) = derive_names(&table_name);
            let table_id = self.next_id();
            let now = Utc::now();
            entity::gen_table::ActiveModel {
                id: Set(table_id),
                tenant_id: Set(tenant_id),
                table_name: Set(table_name.clone()),
                class_name: Set(class_name),
                module_name: Set(module_name),
                function_name: Set(table_name.clone()),
                remark: Set(None),
                created_at: Set(now),
                updated_at: Set(now),
            }
            .insert(&txn)
            .await?;

            for (idx, col) in columns.iter().enumerate() {
                let (rust_type, ts_type) = map_types(&col.data_type, col.nullable);
                // primary keys and audit columns are excluded from insert/edit forms.
                let is_audit = matches!(
                    col.name.as_str(),
                    "id" | "tenant_id" | "created_at" | "updated_at" | "created_by"
                );
                entity::gen_column::ActiveModel {
                    id: Set(self.next_id()),
                    tenant_id: Set(tenant_id),
                    table_id: Set(table_id),
                    column_name: Set(col.name.clone()),
                    column_comment: Set(if col.comment.is_empty() {
                        col.name.clone()
                    } else {
                        col.comment.clone()
                    }),
                    column_type: Set(col.data_type.clone()),
                    rust_type: Set(rust_type),
                    ts_type: Set(ts_type),
                    is_pk: Set(col.is_pk),
                    is_required: Set(!col.nullable && !col.is_pk),
                    is_insert: Set(!col.is_pk && !is_audit),
                    is_edit: Set(!col.is_pk && !is_audit),
                    is_list: Set(!matches!(col.name.as_str(), "tenant_id")),
                    is_query: Set(false),
                    sort: Set(idx as i32),
                }
                .insert(&txn)
                .await?;
            }
            imported += 1;
        }
        txn.commit().await?;
        Ok(imported)
    }

    async fn find_gen_table_scoped(
        &self,
        current: &CurrentUser,
        id: i64,
    ) -> AppResult<entity::gen_table::Model> {
        GenTable::find_by_id(id)
            .filter(entity::gen_table::Column::TenantId.eq(current.acting_tenant()))
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("生成配置不存在"))
    }

    pub async fn get_gen_table(&self, current: &CurrentUser, id: i64) -> AppResult<GenTableDetail> {
        let table = self.find_gen_table_scoped(current, id).await?;
        let columns = GenColumn::find()
            .filter(entity::gen_column::Column::TableId.eq(id))
            .order_by_asc(entity::gen_column::Column::Sort)
            .all(&self.db)
            .await?;
        Ok(GenTableDetail { table, columns })
    }

    pub async fn update_gen_table(
        &self,
        current: &CurrentUser,
        id: i64,
        req: UpdateGenTableReq,
    ) -> AppResult<GenTableDetail> {
        let table = self.find_gen_table_scoped(current, id).await?;
        let txn = self.db.begin().await?;
        let mut active: entity::gen_table::ActiveModel = table.into();
        if let Some(v) = req.class_name {
            active.class_name = Set(v);
        }
        if let Some(v) = req.module_name {
            active.module_name = Set(v);
        }
        if let Some(v) = req.function_name {
            active.function_name = Set(v);
        }
        if let Some(v) = req.remark {
            active.remark = Set(Some(v));
        }
        active.updated_at = Set(Utc::now());
        active.update(&txn).await?;

        for col_req in req.columns {
            let Some(col) = GenColumn::find_by_id(col_req.id)
                .filter(entity::gen_column::Column::TableId.eq(id))
                .one(&txn)
                .await?
            else {
                continue;
            };
            let mut col_active: entity::gen_column::ActiveModel = col.into();
            if let Some(v) = col_req.column_comment {
                col_active.column_comment = Set(v);
            }
            if let Some(v) = col_req.is_required {
                col_active.is_required = Set(v);
            }
            if let Some(v) = col_req.is_insert {
                col_active.is_insert = Set(v);
            }
            if let Some(v) = col_req.is_edit {
                col_active.is_edit = Set(v);
            }
            if let Some(v) = col_req.is_list {
                col_active.is_list = Set(v);
            }
            if let Some(v) = col_req.is_query {
                col_active.is_query = Set(v);
            }
            if let Some(v) = col_req.sort {
                col_active.sort = Set(v);
            }
            col_active.update(&txn).await?;
        }
        txn.commit().await?;
        self.get_gen_table(current, id).await
    }

    pub async fn delete_gen_table(&self, current: &CurrentUser, id: i64) -> AppResult<()> {
        self.find_gen_table_scoped(current, id).await?;
        let txn = self.db.begin().await?;
        GenColumn::delete_many()
            .filter(entity::gen_column::Column::TableId.eq(id))
            .exec(&txn)
            .await?;
        GenTable::delete_by_id(id)
            .filter(entity::gen_table::Column::TenantId.eq(current.acting_tenant()))
            .exec(&txn)
            .await?;
        txn.commit().await?;
        Ok(())
    }

    /// Render the full set of generated source files for a table.
    pub async fn generate_code(&self, current: &CurrentUser, id: i64) -> AppResult<Vec<GenFile>> {
        let detail = self.get_gen_table(current, id).await?;
        Ok(template::render(&detail.table, &detail.columns))
    }
}
