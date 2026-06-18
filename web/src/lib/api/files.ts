import { http, httpClient } from '@/lib/http'
import type { FileItem, PageResult } from '@/lib/api/types'

export interface FileQuery {
  page?: number
  page_size?: number
  original_name?: string
}

export const fileApi = {
  list: (query: FileQuery) => http.get<PageResult<FileItem>>('/files', query),

  upload: async (file: File, isPublic = false) => {
    const form = new FormData()
    form.append('file', file)
    const resp = await httpClient.post<{ data: FileItem }>('/files', form, {
      params: { is_public: isPublic },
    })
    return resp.data.data
  },

  remove: (id: string) => http.delete<null>(`/files/${id}`),

  download: async (item: FileItem) => {
    const resp = await httpClient.get(`/files/${item.id}/download`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(resp.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = item.original_name
    a.click()
    URL.revokeObjectURL(url)
  },
}
