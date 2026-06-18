import { http } from '@/lib/http'
import type { LoginResp, MenuNode, UserInfo } from '@/lib/api/types'

export interface LoginPayload {
  tenant_code: string
  username: string
  password: string
}

export const authApi = {
  login: (payload: LoginPayload) => http.post<LoginResp>('/auth/login', payload),
  logout: () => http.post<null>('/auth/logout'),
  userinfo: () => http.get<UserInfo>('/auth/userinfo'),
  menus: () => http.get<MenuNode[]>('/auth/menus'),
  changePassword: (payload: { old_password: string; new_password: string }) =>
    http.put<null>('/profile/password', payload),
}
