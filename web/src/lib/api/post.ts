import { http } from '@/lib/http'
import type { PageResult, Post } from '@/lib/api/types'

export interface PostQuery {
  page?: number
  page_size?: number
  code?: string
  name?: string
  status?: number
}

export interface CreatePostPayload {
  code: string
  name: string
  sort?: number
  status?: number
  remark?: string | null
}

export type UpdatePostPayload = Partial<Omit<CreatePostPayload, 'code'>>

export const postApi = {
  list: (query: PostQuery) => http.get<PageResult<Post>>('/posts', query),
  create: (payload: CreatePostPayload) => http.post<Post>('/posts', payload),
  update: (id: string, payload: UpdatePostPayload) =>
    http.put<Post>(`/posts/${id}`, payload),
  remove: (id: string) => http.delete<null>(`/posts/${id}`),
}
