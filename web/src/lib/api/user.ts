import { http } from '@/lib/http'
import type { PageResult, User, UserDetail } from '@/lib/api/types'

export interface UserQuery {
  page?: number
  page_size?: number
  username?: string
  status?: number
}

export interface CreateUserPayload {
  username: string
  password: string
  nickname?: string | null
  email?: string | null
  phone?: string | null
  dept_id?: string | null
  role_ids?: string[]
  status?: number
  remark?: string | null
}

export interface UpdateUserPayload {
  nickname?: string | null
  email?: string | null
  phone?: string | null
  dept_id?: string | null
  status?: number
  remark?: string | null
}

export const userApi = {
  list: (query: UserQuery) => http.get<PageResult<User>>('/users', query),
  detail: (id: string) => http.get<UserDetail>(`/users/${id}`),
  create: (payload: CreateUserPayload) => http.post<User>('/users', payload),
  update: (id: string, payload: UpdateUserPayload) =>
    http.put<User>(`/users/${id}`, payload),
  remove: (id: string) => http.delete<null>(`/users/${id}`),
  setStatus: (id: string, status: number) =>
    http.put<null>(`/users/${id}/status`, { status }),
  resetPassword: (id: string, password: string) =>
    http.put<null>(`/users/${id}/password`, { password }),
  assignRoles: (id: string, role_ids: string[]) =>
    http.put<null>(`/users/${id}/roles`, { role_ids }),
}
