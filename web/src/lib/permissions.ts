import { useAuthStore } from '@/stores/auth'
import type { UserInfo } from '@/lib/api/types'

export const PERM = {
  userList: 'system:user:list',
  roleList: 'system:role:list',
  menuList: 'system:menu:list',
  deptList: 'system:dept:list',
  dictList: 'system:dict:list',
  dictCreate: 'system:dict:create',
  dictUpdate: 'system:dict:update',
  dictDelete: 'system:dict:delete',
  postList: 'system:post:list',
  postCreate: 'system:post:create',
  postUpdate: 'system:post:update',
  postDelete: 'system:post:delete',
  paramList: 'system:param:list',
  paramCreate: 'system:param:create',
  paramUpdate: 'system:param:update',
  paramDelete: 'system:param:delete',
  noticeList: 'system:notice:list',
  noticeCreate: 'system:notice:create',
  noticeUpdate: 'system:notice:update',
  noticeDelete: 'system:notice:delete',
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
