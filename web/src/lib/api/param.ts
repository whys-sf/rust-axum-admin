import { http } from '@/lib/http'
import type { PageResult, Param } from '@/lib/api/types'

export interface ParamQuery {
  page?: number
  page_size?: number
  name?: string
  param_key?: string
}

export interface CreateParamPayload {
  name: string
  param_key: string
  param_value: string
  remark?: string | null
}

export type UpdateParamPayload = Partial<Omit<CreateParamPayload, 'param_key'>>

export const paramApi = {
  list: (query: ParamQuery) => http.get<PageResult<Param>>('/params', query),
  create: (payload: CreateParamPayload) => http.post<Param>('/params', payload),
  update: (id: string, payload: UpdateParamPayload) =>
    http.put<Param>(`/params/${id}`, payload),
  remove: (id: string) => http.delete<null>(`/params/${id}`),
}
