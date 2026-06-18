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
