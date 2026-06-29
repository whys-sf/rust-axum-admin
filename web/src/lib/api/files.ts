import { http, httpClient } from '@/lib/http'
import type { FileFolder, FileItem, PageResult } from '@/lib/api/types'

export interface FileQuery {
  page?: number
  page_size?: number
  original_name?: string
  folder_id?: string
}

export const fileApi = {
  list: (query: FileQuery) => http.get<PageResult<FileItem>>('/files', query),

  folders: () => http.get<FileFolder[]>('/file-folders'),

  createFolder: (name: string) => http.post<FileFolder>('/file-folders', { name }),

  updateFolder: (id: string, name: string) =>
    http.put<FileFolder>(`/file-folders/${id}`, { name }),

  deleteFolder: (id: string) => http.delete<null>(`/file-folders/${id}`),

  upload: async (file: File, isPublic = false, folderId?: string | null) => {
    const form = new FormData()
    form.append('file', file)
    const resp = await httpClient.post<{ data: FileItem }>('/files', form, {
      params: { is_public: isPublic, folder_id: folderId || undefined },
    })
    return resp.data.data
  },

  move: (id: string, folderId?: string | null) =>
    http.put<FileItem>(`/files/${id}/move`, { folder_id: folderId || null }),

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
