import { http, httpClient } from '@/lib/http'
import type {
  DbTableInfo,
  GenColumn,
  GenFile,
  GenTable,
  GenTableDetail,
  PageResult,
} from '@/lib/api/types'

export interface GenTableQuery {
  page?: number
  page_size?: number
  table_name?: string
}

export interface UpdateColumnPayload {
  id: string
  column_comment?: string
  is_required?: boolean
  is_insert?: boolean
  is_edit?: boolean
  is_list?: boolean
  is_query?: boolean
  sort?: number
}

export interface UpdateGenTablePayload {
  class_name?: string
  module_name?: string
  function_name?: string
  remark?: string | null
  columns?: UpdateColumnPayload[]
}

export const genApi = {
  dbTables: () => http.get<DbTableInfo[]>('/gen/db-tables'),
  list: (query: GenTableQuery) =>
    http.get<PageResult<GenTable>>('/gen/tables', query),
  import: (table_names: string[]) =>
    http.post<number>('/gen/import', { table_names }),
  detail: (id: string) => http.get<GenTableDetail>(`/gen/tables/${id}`),
  update: (id: string, payload: UpdateGenTablePayload) =>
    http.put<GenTableDetail>(`/gen/tables/${id}`, payload),
  remove: (id: string) => http.delete<null>(`/gen/tables/${id}`),
  preview: (id: string) => http.get<GenFile[]>(`/gen/tables/${id}/preview`),
  download: async (id: string, filename: string) => {
    const resp = await httpClient.get(`/gen/tables/${id}/download`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(resp.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.zip`
    a.click()
    URL.revokeObjectURL(url)
  },
}

export type { GenColumn }
