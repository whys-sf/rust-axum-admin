import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserInfo } from '@/lib/api/types'

interface AuthState {
  token: string
  refreshToken: string
  user: UserInfo | null
  /** Platform admins may impersonate a tenant via the `X-Tenant-Id` header. */
  actingTenantId: string
  setTokens: (token: string, refreshToken: string) => void
  setUser: (user: UserInfo | null) => void
  setActingTenantId: (id: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: '',
      refreshToken: '',
      user: null,
      actingTenantId: '',
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      setUser: (user) => set({ user }),
      setActingTenantId: (actingTenantId) => set({ actingTenantId }),
      clear: () =>
        set({ token: '', refreshToken: '', user: null, actingTenantId: '' }),
    }),
    { name: 'aa-auth' },
  ),
)

export function isAuthenticated(): boolean {
  return Boolean(useAuthStore.getState().token)
}
