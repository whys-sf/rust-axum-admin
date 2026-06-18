import { http } from '@/lib/http'
import type { Dept, DeptNode } from '@/lib/api/types'

export interface CreateDeptPayload {
  parent_id: string
  name: string
  sort?: number
  leader?: string | null
  phone?: string | null
  email?: string | null
  status?: number
}

export type UpdateDeptPayload = Partial<CreateDeptPayload>

export const deptApi = {
  list: () => http.get<DeptNode[]>('/depts'),
  detail: (id: string) => http.get<Dept>(`/depts/${id}`),
  create: (payload: CreateDeptPayload) => http.post<Dept>('/depts', payload),
  update: (id: string, payload: UpdateDeptPayload) =>
    http.put<Dept>(`/depts/${id}`, payload),
  remove: (id: string) => http.delete<null>(`/depts/${id}`),
}
