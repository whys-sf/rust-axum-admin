import { http } from '@/lib/http'
import type { PageResult, Role } from '@/lib/api/types'

export interface RoleQuery {
  page?: number
  page_size?: number
  name?: string
  status?: number
}

export interface CreateRolePayload {
  name: string
  code: string
  sort?: number
  status?: number
  data_scope?: number
  remark?: string | null
  menu_ids?: string[]
}

export interface UpdateRolePayload {
  name?: string
  sort?: number
  status?: number
  data_scope?: number
  remark?: string | null
}

export const roleApi = {
  list: (query: RoleQuery) => http.get<PageResult<Role>>('/roles', query),
  detail: (id: string) => http.get<Role>(`/roles/${id}`),
  create: (payload: CreateRolePayload) => http.post<Role>('/roles', payload),
  update: (id: string, payload: UpdateRolePayload) =>
    http.put<Role>(`/roles/${id}`, payload),
  remove: (id: string) => http.delete<null>(`/roles/${id}`),
  setStatus: (id: string, status: number) =>
    http.put<null>(`/roles/${id}/status`, { status }),
  menuIds: (id: string) => http.get<string[]>(`/roles/${id}/menus`),
  assignMenus: (id: string, menu_ids: string[]) =>
    http.put<null>(`/roles/${id}/menus`, { menu_ids }),
  deptIds: (id: string) => http.get<string[]>(`/roles/${id}/depts`),
  assignDepts: (id: string, dept_ids: string[]) =>
    http.put<null>(`/roles/${id}/depts`, { dept_ids }),
}
