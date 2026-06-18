// All snowflake ids are serialized as strings by the backend, so they are
// modelled as `string` end-to-end here.

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

export interface LoginResp {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export interface UserInfo {
  id: string
  username: string
  nickname?: string | null
  avatar?: string | null
  tenant_id: string
  tenant_name: string
  is_platform: boolean
  roles: string[]
  permissions: string[]
}

export interface User {
  id: string
  tenant_id: string
  username: string
  nickname?: string | null
  email?: string | null
  phone?: string | null
  avatar?: string | null
  gender: number
  status: number
  dept_id?: string | null
  remark?: string | null
  last_login_at?: string | null
  last_login_ip?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface UserDetail extends User {
  role_ids: string[]
}

export interface Role {
  id: string
  tenant_id: string
  name: string
  code: string
  sort: number
  status: number
  data_scope: number
  remark?: string | null
  created_at: string
  updated_at: string
}

export interface Menu {
  id: string
  tenant_id: string
  parent_id: string
  name: string
  type: number
  path?: string | null
  component?: string | null
  perm?: string | null
  api_path?: string | null
  api_method?: string | null
  icon?: string | null
  sort: number
  visible: number
  status: number
  is_cache: number
  is_external: number
  created_at: string
  updated_at: string
}

export interface MenuNode extends Menu {
  children: MenuNode[]
}

export interface Dept {
  id: string
  tenant_id: string
  parent_id: string
  ancestors: string
  name: string
  sort: number
  leader?: string | null
  phone?: string | null
  email?: string | null
  status: number
  created_at: string
  updated_at: string
}

export interface DeptNode extends Dept {
  children: DeptNode[]
}

export interface DictType {
  id: string
  tenant_id: string
  code: string
  name: string
  is_tree: boolean
  status: number
  remark?: string | null
  created_at: string
  updated_at: string
}

export interface DictItem {
  id: string
  tenant_id: string
  dict_code: string
  parent_id: string
  label: string
  value: string
  sort: number
  status: number
  css_class?: string | null
  list_class?: string | null
  remark?: string | null
  created_at: string
  updated_at: string
}

export interface DictItemNode extends DictItem {
  children: DictItemNode[]
}

export interface Tenant {
  id: string
  name: string
  code: string
  contact_name?: string | null
  contact_phone?: string | null
  domain?: string | null
  package_id?: string | null
  user_limit: number
  status: number
  expire_at?: string | null
  remark?: string | null
  created_at: string
  updated_at: string
}

export interface AppSettings {
  site_name: string
  login_title: string
  login_subtitle: string
  login_background: string
  logo_url: string
}

export interface OperationLog {
  id: string
  tenant_id?: string | null
  user_id?: string | null
  username?: string | null
  module?: string | null
  action?: string | null
  method?: string | null
  path?: string | null
  ip?: string | null
  user_agent?: string | null
  request_body?: string | null
  status_code?: number | null
  duration_ms?: number | null
  error_msg?: string | null
  created_at: string
}

export interface Post {
  id: string
  tenant_id: string
  code: string
  name: string
  sort: number
  status: number
  remark?: string | null
  created_at: string
  updated_at: string
}

export interface Param {
  id: string
  tenant_id: string
  name: string
  param_key: string
  param_value: string
  param_type: number
  remark?: string | null
  created_at: string
  updated_at: string
}

export interface Notice {
  id: string
  tenant_id: string
  title: string
  notice_type: number
  content: string
  status: number
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  tenant_id: string
  name: string
  job_group: string
  invoke_target: string
  cron_expr: string
  status: number
  remark?: string | null
  last_run_at?: string | null
  next_run_at?: string | null
  created_at: string
  updated_at: string
}

export interface GenTable {
  id: string
  tenant_id: string
  table_name: string
  class_name: string
  module_name: string
  function_name: string
  remark?: string | null
  created_at: string
  updated_at: string
}

export interface GenColumn {
  id: string
  tenant_id: string
  table_id: string
  column_name: string
  column_comment: string
  column_type: string
  rust_type: string
  ts_type: string
  is_pk: boolean
  is_required: boolean
  is_insert: boolean
  is_edit: boolean
  is_list: boolean
  is_query: boolean
  sort: number
}

export interface GenTableDetail {
  table: GenTable
  columns: GenColumn[]
}

export interface DbTableInfo {
  table_name: string
  comment: string
  imported: boolean
}

export interface GenFile {
  path: string
  language: string
  content: string
}

export interface JobLog {
  id: string
  tenant_id: string
  job_id: string
  job_name: string
  invoke_target: string
  status: number
  message: string
  started_at: string
  duration_ms: number
  created_at: string
}

export interface InboxItem {
  message_id: string
  title: string
  content: string
  msg_type: number
  sender_id?: string | null
  sender_name?: string | null
  is_read: boolean
  read_at?: string | null
  created_at: string
}

export interface SentMessage {
  id: string
  title: string
  content: string
  msg_type: number
  sender_id?: string | null
  sender_name?: string | null
  total: number
  read: number
  created_at: string
}
