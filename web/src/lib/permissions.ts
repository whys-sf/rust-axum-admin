import { useAuthStore } from "@/stores/auth";
import type { UserInfo } from "@/lib/api/types";

export const PERM = {
  userList: "system:user:list",
  roleList: "system:role:list",
  menuList: "system:menu:list",
  deptList: "system:dept:list",
  dictList: "system:dict:list",
  dictCreate: "system:dict:create",
  dictUpdate: "system:dict:update",
  dictDelete: "system:dict:delete",
  postList: "system:post:list",
  postCreate: "system:post:create",
  postUpdate: "system:post:update",
  postDelete: "system:post:delete",
  paramList: "system:param:list",
  paramCreate: "system:param:create",
  paramUpdate: "system:param:update",
  paramDelete: "system:param:delete",
  noticeList: "system:notice:list",
  noticeCreate: "system:notice:create",
  noticeUpdate: "system:notice:update",
  noticeDelete: "system:notice:delete",
  messageList: "system:message:list",
  messageCreate: "system:message:create",
  messageDelete: "system:message:delete",
  jobList: "system:job:list",
  jobCreate: "system:job:create",
  jobUpdate: "system:job:update",
  jobDelete: "system:job:delete",
  jobRun: "system:job:run",
  genList: "system:gen:list",
  genImport: "system:gen:import",
  genEdit: "system:gen:edit",
  genDelete: "system:gen:delete",
  genPreview: "system:gen:preview",
  fileList: "system:file:list",
  fileUpload: "system:file:upload",
  fileDelete: "system:file:delete",
  onlineList: "system:online:list",
  onlineKick: "system:online:kick",
  monitorList: "system:monitor:list",
  logList: "system:log:list",
  configList: "system:config:list",
  configEdit: "system:config:edit",
  tenantList: "platform:tenant:list",
  // 课程
  courseList: "project:course:list",
  courseSync: "project:course:sync",
  courseUpdate: "project:course:update",
  courseDelete: "project:course:delete",
} as const;

/**
 * Platform admins bypass RBAC on the backend, so the frontend mirrors that by
 * granting every permission to them.
 */
export function hasPermission(
  user: UserInfo | null | undefined,
  perm: string,
): boolean {
  if (!user) return false;
  if (user.is_platform) return true;
  return (user.permissions ?? []).includes(perm);
}

export function usePermission(perm: string): boolean {
  const user = useAuthStore((s) => s.user);
  return hasPermission(user, perm);
}
