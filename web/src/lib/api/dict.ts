import { http } from '@/lib/http'
import type {
  DictItem,
  DictItemNode,
  DictType,
  PageResult,
} from '@/lib/api/types'

export interface DictTypeQuery {
  page?: number
  page_size?: number
  code?: string
  name?: string
  status?: number
}

export interface CreateDictTypePayload {
  code: string
  name: string
  is_tree?: boolean
  status?: number
  remark?: string | null
}

export type UpdateDictTypePayload = Partial<
  Omit<CreateDictTypePayload, 'code'>
>

export interface CreateDictItemPayload {
  dict_code: string
  parent_id?: string
  label: string
  value: string
  sort?: number
  status?: number
  css_class?: string | null
  list_class?: string | null
  remark?: string | null
}

export type UpdateDictItemPayload = Partial<
  Omit<CreateDictItemPayload, 'dict_code'>
>

export const dictApi = {
  listTypes: (query: DictTypeQuery) =>
    http.get<PageResult<DictType>>('/dicts/types', query),
  createType: (payload: CreateDictTypePayload) =>
    http.post<DictType>('/dicts/types', payload),
  updateType: (id: string, payload: UpdateDictTypePayload) =>
    http.put<DictType>(`/dicts/types/${id}`, payload),
  removeType: (id: string) => http.delete<null>(`/dicts/types/${id}`),
  listItems: (typeId: string) =>
    http.get<DictItemNode[]>(`/dicts/types/${typeId}/items`),
  itemsByCode: (code: string) =>
    http.get<DictItemNode[]>(`/dicts/code/${code}/items`),
  createItem: (payload: CreateDictItemPayload) =>
    http.post<DictItem>('/dicts/items', payload),
  updateItem: (id: string, payload: UpdateDictItemPayload) =>
    http.put<DictItem>(`/dicts/items/${id}`, payload),
  removeItem: (id: string) => http.delete<null>(`/dicts/items/${id}`),
}
