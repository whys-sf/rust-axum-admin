import { http } from '@/lib/http'
import type { Menu, MenuNode } from '@/lib/api/types'

export interface CreateMenuPayload {
  parent_id: string
  name: string
  type: number
  path?: string | null
  component?: string | null
  perm?: string | null
  api_path?: string | null
  api_method?: string | null
  icon?: string | null
  sort?: number
  visible?: number
  status?: number
}

export type UpdateMenuPayload = Partial<CreateMenuPayload>

export const menuApi = {
  list: () => http.get<MenuNode[]>('/menus'),
  detail: (id: string) => http.get<Menu>(`/menus/${id}`),
  create: (payload: CreateMenuPayload) => http.post<Menu>('/menus', payload),
  update: (id: string, payload: UpdateMenuPayload) =>
    http.put<Menu>(`/menus/${id}`, payload),
  remove: (id: string) => http.delete<null>(`/menus/${id}`),
}
