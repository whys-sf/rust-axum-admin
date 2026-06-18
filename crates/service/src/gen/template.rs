//! Pure string templates that turn imported table metadata into scaffold code.
//! The output targets the conventions of this very repo (SeaORM entity, service
//! `impl Services`, axum handlers, and a React + react-query feature page) so the
//! generated files drop in with minimal edits.

use entity::gen_column::Model as Column;
use entity::gen_table::Model as Table;

use crate::dto::GenFile;

fn pascal(snake: &str) -> String {
    snake
        .split('_')
        .filter(|s| !s.is_empty())
        .map(|seg| {
            let mut chars = seg.chars();
            match chars.next() {
                Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect()
}

/// Bigint columns are serialized as strings on the wire (snowflake convention).
fn is_bigint(col: &Column) -> bool {
    col.rust_type == "i64" || col.rust_type == "Option<i64>"
}

fn rust_field(col: &Column) -> String {
    let mut lines = String::new();
    if is_bigint(col) {
        if col.rust_type.starts_with("Option") {
            lines.push_str("    #[serde(with = \"crate::id::string_opt\")]\n");
            lines.push_str("    #[schema(value_type = Option<String>)]\n");
        } else {
            lines.push_str("    #[serde(with = \"crate::id::string\")]\n");
            lines.push_str("    #[schema(value_type = String)]\n");
        }
    }
    if col.is_pk {
        lines.push_str("    #[sea_orm(primary_key, auto_increment = false)]\n");
    }
    lines.push_str(&format!(
        "    pub {}: {},\n",
        col.column_name, col.rust_type
    ));
    lines
}

pub fn render(table: &Table, columns: &[Column]) -> Vec<GenFile> {
    vec![
        entity_rs(table, columns),
        service_rs(table, columns),
        handler_rs(table, columns),
        ts_types(table, columns),
        ts_api(table),
        tsx_page(table, columns),
    ]
}

fn entity_rs(table: &Table, columns: &[Column]) -> GenFile {
    let class = &table.class_name;
    let fields: String = columns.iter().map(rust_field).collect();
    let content = format!(
        "use chrono::{{DateTime, Utc}};\n\
         use sea_orm::entity::prelude::*;\n\
         use serde::{{Deserialize, Serialize}};\n\n\
         #[derive(\n    Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, utoipa::ToSchema,\n)]\n\
         #[schema(as = {class}Model)]\n\
         #[sea_orm(table_name = \"{table_name}\")]\n\
         pub struct Model {{\n{fields}}}\n\n\
         #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]\n\
         pub enum Relation {{}}\n\n\
         impl ActiveModelBehavior for ActiveModel {{}}\n",
        class = class,
        table_name = table.table_name,
        fields = fields,
    );
    GenFile {
        path: format!("crates/entity/src/{}.rs", table.module_name),
        language: "rust".into(),
        content,
    }
}

fn has_col(columns: &[Column], name: &str) -> bool {
    columns.iter().any(|c| c.column_name == name)
}

fn service_rs(table: &Table, columns: &[Column]) -> GenFile {
    let class = &table.class_name;
    let module = &table.module_name;
    let entity_path = format!("entity::{module}");
    let has_tenant = has_col(columns, "tenant_id");
    let has_created = has_col(columns, "created_at");
    let has_updated = has_col(columns, "updated_at");

    let tenant_filter = if has_tenant {
        format!(".filter({entity_path}::Column::TenantId.eq(current.acting_tenant()))")
    } else {
        String::new()
    };

    // create: assign id + tenant + timestamps; copy editable columns from the request.
    let mut create_fields = String::from("        id: Set(self.next_id()),\n");
    if has_tenant {
        create_fields.push_str("        tenant_id: Set(current.acting_tenant()),\n");
    }
    for col in columns.iter().filter(|c| c.is_insert) {
        create_fields.push_str(&format!(
            "        {name}: Set(req.{name}),\n",
            name = col.column_name
        ));
    }
    if has_created {
        create_fields.push_str("        created_at: Set(now),\n");
    }
    if has_updated {
        create_fields.push_str("        updated_at: Set(now),\n");
    }

    let mut update_fields = String::new();
    for col in columns.iter().filter(|c| c.is_edit) {
        update_fields.push_str(&format!(
            "        active.{name} = Set(req.{name});\n",
            name = col.column_name
        ));
    }
    if has_updated {
        update_fields.push_str("        active.updated_at = Set(Utc::now());\n");
    }

    let content = format!(
        "use chrono::Utc;\n\
         use common::response::PageResult;\n\
         use common::{{AppError, AppResult}};\n\
         use entity::prelude::*;\n\
         use sea_orm::{{ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, Set}};\n\n\
         use crate::dto::{{Create{class}Req, CurrentUser, {class}Query, Update{class}Req}};\n\
         use crate::Services;\n\n\
         impl Services {{\n\
         \x20   pub async fn list_{module}(\n\
         \x20       &self,\n\
         \x20       current: &CurrentUser,\n\
         \x20       query: {class}Query,\n\
         \x20   ) -> AppResult<PageResult<{entity_path}::Model>> {{\n\
         \x20       let (page, page_size) = query.pagination().normalized();\n\
         \x20       let paginator = {class}::find(){tenant_filter}\n\
         \x20           .paginate(&self.db, page_size);\n\
         \x20       let total = paginator.num_items().await?;\n\
         \x20       let list = paginator.fetch_page(page - 1).await?;\n\
         \x20       Ok(PageResult::new(list, total, page, page_size))\n\
         \x20   }}\n\n\
         \x20   pub async fn get_{module}(&self, current: &CurrentUser, id: i64) -> AppResult<{entity_path}::Model> {{\n\
         \x20       {class}::find_by_id(id){tenant_filter}\n\
         \x20           .one(&self.db)\n\
         \x20           .await?\n\
         \x20           .ok_or_else(|| AppError::not_found(\"记录不存在\"))\n\
         \x20   }}\n\n\
         \x20   pub async fn create_{module}(\n\
         \x20       &self,\n\
         \x20       current: &CurrentUser,\n\
         \x20       req: Create{class}Req,\n\
         \x20   ) -> AppResult<{entity_path}::Model> {{\n\
         \x20       let now = Utc::now();\n\
         \x20       let model = {entity_path}::ActiveModel {{\n{create_fields}\
         \x20           ..Default::default()\n\
         \x20       }};\n\
         \x20       Ok(model.insert(&self.db).await?)\n\
         \x20   }}\n\n\
         \x20   pub async fn update_{module}(\n\
         \x20       &self,\n\
         \x20       current: &CurrentUser,\n\
         \x20       id: i64,\n\
         \x20       req: Update{class}Req,\n\
         \x20   ) -> AppResult<{entity_path}::Model> {{\n\
         \x20       let found = self.get_{module}(current, id).await?;\n\
         \x20       let mut active: {entity_path}::ActiveModel = found.into();\n{update_fields}\
         \x20       Ok(active.update(&self.db).await?)\n\
         \x20   }}\n\n\
         \x20   pub async fn delete_{module}(&self, current: &CurrentUser, id: i64) -> AppResult<()> {{\n\
         \x20       self.get_{module}(current, id).await?;\n\
         \x20       {class}::delete_by_id(id){tenant_filter}\n\
         \x20           .exec(&self.db)\n\
         \x20           .await?;\n\
         \x20       Ok(())\n\
         \x20   }}\n\
         }}\n",
        class = class,
        module = module,
        entity_path = entity_path,
        tenant_filter = tenant_filter,
        create_fields = create_fields,
        update_fields = update_fields,
    );
    GenFile {
        path: format!("crates/service/src/{module}.rs"),
        language: "rust".into(),
        content,
    }
}

fn handler_rs(table: &Table, _columns: &[Column]) -> GenFile {
    let class = &table.class_name;
    let module = &table.module_name;
    let content = format!(
        "use axum::extract::{{Path, Query, State}};\n\
         use axum::Extension;\n\
         use common::response::{{ApiResponse, PageResult}};\n\
         use common::AppResult;\n\
         use service::dto::{{Create{class}Req, CurrentUser, {class}Query, Update{class}Req}};\n\n\
         use crate::extract::ValidatedJson;\n\
         use crate::state::AppState;\n\n\
         pub async fn list(\n\
         \x20   State(state): State<AppState>,\n\
         \x20   Extension(current): Extension<CurrentUser>,\n\
         \x20   Query(query): Query<{class}Query>,\n\
         ) -> AppResult<ApiResponse<PageResult<entity::{module}::Model>>> {{\n\
         \x20   let data = state.services.list_{module}(&current, query).await?;\n\
         \x20   Ok(ApiResponse::ok(data))\n\
         }}\n\n\
         pub async fn detail(\n\
         \x20   State(state): State<AppState>,\n\
         \x20   Extension(current): Extension<CurrentUser>,\n\
         \x20   Path(id): Path<i64>,\n\
         ) -> AppResult<ApiResponse<entity::{module}::Model>> {{\n\
         \x20   let data = state.services.get_{module}(&current, id).await?;\n\
         \x20   Ok(ApiResponse::ok(data))\n\
         }}\n\n\
         pub async fn create(\n\
         \x20   State(state): State<AppState>,\n\
         \x20   Extension(current): Extension<CurrentUser>,\n\
         \x20   ValidatedJson(req): ValidatedJson<Create{class}Req>,\n\
         ) -> AppResult<ApiResponse<entity::{module}::Model>> {{\n\
         \x20   let data = state.services.create_{module}(&current, req).await?;\n\
         \x20   Ok(ApiResponse::ok(data))\n\
         }}\n\n\
         pub async fn update(\n\
         \x20   State(state): State<AppState>,\n\
         \x20   Extension(current): Extension<CurrentUser>,\n\
         \x20   Path(id): Path<i64>,\n\
         \x20   ValidatedJson(req): ValidatedJson<Update{class}Req>,\n\
         ) -> AppResult<ApiResponse<entity::{module}::Model>> {{\n\
         \x20   let data = state.services.update_{module}(&current, id, req).await?;\n\
         \x20   Ok(ApiResponse::ok(data))\n\
         }}\n\n\
         pub async fn remove(\n\
         \x20   State(state): State<AppState>,\n\
         \x20   Extension(current): Extension<CurrentUser>,\n\
         \x20   Path(id): Path<i64>,\n\
         ) -> AppResult<ApiResponse<()>> {{\n\
         \x20   state.services.delete_{module}(&current, id).await?;\n\
         \x20   Ok(ApiResponse::ok_empty())\n\
         }}\n\n\
         // 在 routes 中注册（RBAC 层）：\n\
         //   .route(\"/{module}s\", get(list).post(create))\n\
         //   .route(\"/{module}s/{{id}}\", get(detail).put(update).delete(remove))\n",
        class = class,
        module = module,
    );
    GenFile {
        path: format!("crates/server/src/handlers/{module}.rs"),
        language: "rust".into(),
        content,
    }
}

fn ts_types(table: &Table, columns: &[Column]) -> GenFile {
    let class = pascal(&table.module_name);
    let mut fields = String::new();
    for col in columns {
        let optional = col.rust_type.starts_with("Option");
        fields.push_str(&format!(
            "  {name}{opt}: {ty}{nullable}\n",
            name = col.column_name,
            opt = if optional { "?" } else { "" },
            ty = col.ts_type,
            nullable = if optional { " | null" } else { "" },
        ));
    }
    let content = format!("export interface {class} {{\n{fields}}}\n");
    GenFile {
        path: format!("web/src/lib/api/{}.types.ts", table.module_name),
        language: "typescript".into(),
        content,
    }
}

fn ts_api(table: &Table) -> GenFile {
    let class = pascal(&table.module_name);
    let module = &table.module_name;
    let content = format!(
        "import {{ http }} from '@/lib/http'\n\
         import type {{ {class} }} from '@/lib/api/{module}.types'\n\
         import type {{ PageResult }} from '@/lib/api/types'\n\n\
         export interface {class}Query {{\n\
         \x20 page?: number\n\
         \x20 page_size?: number\n\
         }}\n\n\
         export type Create{class}Payload = Partial<{class}>\n\
         export type Update{class}Payload = Partial<{class}>\n\n\
         export const {module}Api = {{\n\
         \x20 list: (query: {class}Query) => http.get<PageResult<{class}>>('/{module}s', query),\n\
         \x20 create: (payload: Create{class}Payload) => http.post<{class}>('/{module}s', payload),\n\
         \x20 update: (id: string, payload: Update{class}Payload) =>\n\
         \x20   http.put<{class}>(`/{module}s/${{id}}`, payload),\n\
         \x20 remove: (id: string) => http.delete<null>(`/{module}s/${{id}}`),\n\
         }}\n",
        class = class,
        module = module,
    );
    GenFile {
        path: format!("web/src/lib/api/{module}.ts"),
        language: "typescript".into(),
        content,
    }
}

fn tsx_page(table: &Table, columns: &[Column]) -> GenFile {
    let class = pascal(&table.module_name);
    let module = &table.module_name;
    let title = &table.function_name;
    let mut heads = String::new();
    let mut cells = String::new();
    for col in columns.iter().filter(|c| c.is_list) {
        heads.push_str(&format!(
            "              <TableHead>{}</TableHead>\n",
            col.column_comment
        ));
        cells.push_str(&format!(
            "                  <TableCell>{{String(row.{} ?? '')}}</TableCell>\n",
            col.column_name
        ));
    }
    let col_count = columns.iter().filter(|c| c.is_list).count();
    let content = format!(
        "import {{ useState }} from 'react'\n\
         import {{ useQuery }} from '@tanstack/react-query'\n\
         import {{ Card, CardContent, CardHeader, CardTitle }} from '@/components/ui/card'\n\
         import {{\n\
         \x20 Table,\n\
         \x20 TableBody,\n\
         \x20 TableCell,\n\
         \x20 TableHead,\n\
         \x20 TableHeader,\n\
         \x20 TableRow,\n\
         }} from '@/components/ui/table'\n\
         import {{ PagePagination }} from '@/components/common/page-pagination'\n\
         import {{ {module}Api }} from '@/lib/api/{module}'\n\n\
         const PAGE_SIZE = 10\n\n\
         export function {class}Page() {{\n\
         \x20 const [page, setPage] = useState(1)\n\
         \x20 const query = useQuery({{\n\
         \x20   queryKey: ['{module}', {{ page }}],\n\
         \x20   queryFn: () => {module}Api.list({{ page, page_size: PAGE_SIZE }}),\n\
         \x20 }})\n\
         \x20 const list = query.data?.list ?? []\n\n\
         \x20 return (\n\
         \x20   <Card>\n\
         \x20     <CardHeader>\n\
         \x20       <CardTitle>{title}</CardTitle>\n\
         \x20     </CardHeader>\n\
         \x20     <CardContent>\n\
         \x20       <Table>\n\
         \x20         <TableHeader>\n\
         \x20           <TableRow>\n{heads}\
         \x20           </TableRow>\n\
         \x20         </TableHeader>\n\
         \x20         <TableBody>\n\
         \x20           {{list.length === 0 ? (\n\
         \x20             <TableRow>\n\
         \x20               <TableCell colSpan={{{col_count}}} className=\"text-center text-muted-foreground\">\n\
         \x20                 暂无数据\n\
         \x20               </TableCell>\n\
         \x20             </TableRow>\n\
         \x20           ) : (\n\
         \x20             list.map((row) => (\n\
         \x20               <TableRow key={{String(row.id)}}>\n{cells}\
         \x20               </TableRow>\n\
         \x20             ))\n\
         \x20           )}}\n\
         \x20         </TableBody>\n\
         \x20       </Table>\n\
         \x20       <PagePagination\n\
         \x20         page={{page}}\n\
         \x20         pageSize={{PAGE_SIZE}}\n\
         \x20         total={{query.data?.total ?? 0}}\n\
         \x20         onChange={{setPage}}\n\
         \x20       />\n\
         \x20     </CardContent>\n\
         \x20   </Card>\n\
         \x20 )\n\
         }}\n",
        class = class,
        module = module,
        title = title,
        heads = heads,
        cells = cells,
        col_count = col_count,
    );
    GenFile {
        path: format!("web/src/features/{module}/{module}-page.tsx"),
        language: "tsx".into(),
        content,
    }
}
