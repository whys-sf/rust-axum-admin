import { http } from '@/lib/http'
import type { Notice, PageResult } from '@/lib/api/types'

export interface NoticeQuery {
  page?: number
  page_size?: number
  title?: string
  notice_type?: number
  status?: number
}

export interface CreateNoticePayload {
  title: string
  notice_type?: number
  content?: string
  status?: number
}

export type UpdateNoticePayload = Partial<CreateNoticePayload>

export const noticeApi = {
  list: (query: NoticeQuery) => http.get<PageResult<Notice>>('/notices', query),
  create: (payload: CreateNoticePayload) =>
    http.post<Notice>('/notices', payload),
  update: (id: string, payload: UpdateNoticePayload) =>
    http.put<Notice>(`/notices/${id}`, payload),
  remove: (id: string) => http.delete<null>(`/notices/${id}`),
}
