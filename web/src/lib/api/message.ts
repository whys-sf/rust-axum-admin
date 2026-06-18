import { http } from '@/lib/http'
import type { InboxItem, PageResult, SentMessage } from '@/lib/api/types'

export interface SendMessagePayload {
  title: string
  content?: string
  msg_type?: number
  receiver_ids?: string[]
}

export interface MessageQuery {
  page?: number
  page_size?: number
  title?: string
}

export interface InboxQuery {
  page?: number
  page_size?: number
  unread_only?: boolean
}

export const messageApi = {
  // admin
  list: (query: MessageQuery) =>
    http.get<PageResult<SentMessage>>('/messages', query),
  send: (payload: SendMessagePayload) =>
    http.post<SentMessage>('/messages', payload),
  remove: (id: string) => http.delete<null>(`/messages/${id}`),
  // personal inbox
  inbox: (query: InboxQuery) =>
    http.get<PageResult<InboxItem>>('/my/messages', query),
  unreadCount: () => http.get<{ count: number }>('/my/messages/unread-count'),
  view: (id: string) => http.get<InboxItem>(`/my/messages/${id}`),
  markRead: (id: string) => http.put<null>(`/my/messages/${id}/read`),
  markAllRead: () => http.put<null>('/my/messages/read-all'),
  removeFromInbox: (id: string) => http.delete<null>(`/my/messages/${id}`),
}
