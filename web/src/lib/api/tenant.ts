import { http } from '@/lib/http'
import type { PageResult, Tenant } from '@/lib/api/types'

export interface TenantQuery {
  page?: number
  page_size?: number
  name?: string
}

export interface CreateTenantPayload {
  name: string
  code: string
  contact_name?: string | null
  contact_phone?: string | null
  user_limit?: number | null
  expire_at?: string | null
  admin_username: string
  admin_password: string
}

export interface UpdateTenantPayload {
  name?: string
  contact_name?: string | null
  contact_phone?: string | null
  user_limit?: number | null
  expire_at?: string | null
  remark?: string | null
}

export const tenantApi = {
  list: (query: TenantQuery) =>
    http.get<PageResult<Tenant>>('/platform/tenants', query),
  detail: (id: string) => http.get<Tenant>(`/platform/tenants/${id}`),
  create: (payload: CreateTenantPayload) =>
    http.post<Tenant>('/platform/tenants', payload),
  update: (id: string, payload: UpdateTenantPayload) =>
    http.put<Tenant>(`/platform/tenants/${id}`, payload),
  remove: (id: string) => http.delete<null>(`/platform/tenants/${id}`),
  setStatus: (id: string, status: number) =>
    http.put<null>(`/platform/tenants/${id}/status`, { status }),
}
