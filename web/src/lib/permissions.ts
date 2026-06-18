import { useAuthStore } from '@/stores/auth'
import type { UserInfo } from '@/lib/api/types'

export const PERM = {
  userList: 'system:user:list',
  roleList: 'system:role:list',
  menuList: 'system:menu:list',
  deptList: 'system:dept:list',
  logList: 'system:log:list',
  configList: 'system:config:list',
  configEdit: 'system:config:edit',
  tenantList: 'platform:tenant:list',
} as const

/**
 * Platform admins bypass RBAC on the backend, so the frontend mirrors that by
 * granting every permission to them.
 */
export function hasPermission(
  user: UserInfo | null | undefined,
  perm: string,
): boolean {
  if (!user) return false
  if (user.is_platform) return true
  return (user.permissions ?? []).includes(perm)
}

export function usePermission(perm: string): boolean {
  const user = useAuthStore((s) => s.user)
  return hasPermission(user, perm)
}
