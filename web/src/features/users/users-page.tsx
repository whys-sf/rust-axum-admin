import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ManagementPage } from "@/components/common/management-page";
import { DataTable, type DataTableColumnDef } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { userApi, type CreateUserPayload, type UpdateUserPayload } from "@/lib/api/user";
import { roleApi } from "@/lib/api/role";
import { deptApi } from "@/lib/api/dept";
import { flattenTree } from "@/lib/tree";
import { PERM, usePermission } from "@/lib/permissions";
import type { User } from "@/lib/api/types";
import { UserDialog } from "@/features/users/user-dialog";
import { AssignRolesDialog } from "@/features/users/assign-roles-dialog";
import { ResetPasswordDialog } from "@/features/users/reset-password-dialog";
import { DeleteUserDialog } from "@/features/users/delete-user-dialog";

const PAGE_SIZE = 10;

type DialogState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; user: User }
  | { kind: "roles"; user: User }
  | { kind: "reset"; user: User }
  | { kind: "delete"; user: User };

export function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "enabled" | "disabled">("all");
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const canRoles = usePermission(PERM.roleList);
  const canDepts = usePermission(PERM.deptList);

  const usersQuery = useQuery({
    queryKey: ["users", { page, username: search, status }],
    queryFn: () =>
      userApi.list({
        page,
        page_size: PAGE_SIZE,
        username: search || undefined,
        status: status === "all" ? undefined : status === "enabled" ? 1 : 0,
      }),
  });
  const rolesQuery = useQuery({
    queryKey: ["roles", "all"],
    queryFn: () => roleApi.list({ page: 1, page_size: 200 }),
    enabled: canRoles,
  });
  const deptsQuery = useQuery({
    queryKey: ["depts"],
    queryFn: deptApi.list,
    enabled: canDepts,
  });

  const deptOptions = useMemo(
    () => flattenTree(deptsQuery.data ?? []),
    [deptsQuery.data],
  );
  const deptName = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of deptOptions) map.set(o.id, o.name);
    return map;
  }, [deptOptions]);

  const detailQuery = useQuery({
    queryKey: ["user-detail", dialog.kind === "roles" ? dialog.user.id : null],
    queryFn: () => userApi.detail((dialog as { user: User }).user.id),
    enabled: dialog.kind === "roles",
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["users"] });
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => userApi.create(payload),
    onSuccess: () => {
      toast.success("已创建");
      invalidate();
      setDialog({ kind: "none" });
    },
  });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; payload: UpdateUserPayload }) =>
      userApi.update(vars.id, vars.payload),
    onSuccess: () => {
      toast.success("已保存");
      invalidate();
      setDialog({ kind: "none" });
    },
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => userApi.remove(id),
    onSuccess: () => {
      toast.success("已删除");
      invalidate();
      setDialog({ kind: "none" });
    },
  });
  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: number }) =>
      userApi.setStatus(vars.id, vars.status),
    onSuccess: () => {
      toast.success("状态已更新");
      invalidate();
    },
  });
  const rolesMutation = useMutation({
    mutationFn: (vars: { id: string; roleIds: string[] }) =>
      userApi.assignRoles(vars.id, vars.roleIds),
    onSuccess: () => {
      toast.success("角色已更新");
      setDialog({ kind: "none" });
    },
  });
  const resetMutation = useMutation({
    mutationFn: (vars: { id: string; password: string }) =>
      userApi.resetPassword(vars.id, vars.password),
    onSuccess: () => {
      toast.success("密码已重置");
      setDialog({ kind: "none" });
    },
  });

  const list = usersQuery.data?.list ?? [];

  const columns: DataTableColumnDef<User>[] = [
    {
      accessorKey: "username",
      header: "用户名",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.username}</span>
      ),
    },
    {
      accessorKey: "nickname",
      header: "昵称",
      cell: ({ row }) => row.original.nickname || "—",
    },
    {
      accessorKey: "email",
      header: "邮箱",
      className: "hidden md:table-cell",
      meta: { cellClassName: "hidden md:table-cell" },
      cell: ({ row }) => row.original.email || "—",
    },
    {
      accessorKey: "phone",
      header: "手机号",
      className: "hidden lg:table-cell",
      meta: { cellClassName: "hidden lg:table-cell" },
      cell: ({ row }) => row.original.phone || "—",
    },
    {
      accessorKey: "dept_id",
      header: "部门",
      className: "hidden xl:table-cell",
      meta: { cellClassName: "hidden xl:table-cell" },
      cell: ({ row }) =>
        row.original.dept_id
          ? (deptName.get(row.original.dept_id) ?? "未分配")
          : "未分配",
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch
            aria-label={`${row.original.status === 1 ? "停用" : "启用"}用户 ${row.original.username}`}
            checked={row.original.status === 1}
            disabled={statusMutation.isPending}
            onCheckedChange={(checked) =>
              statusMutation.mutate({
                id: row.original.id,
                status: checked ? 1 : 0,
              })
            }
          />
          <div className="hidden sm:block">
            <StatusBadge status={row.original.status} />
          </div>
        </div>
      ),
    },
    {
      id: "actions",
      header: "操作",
      className: "text-right",
      meta: { cellClassName: "text-right" },
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="编辑"
              onClick={() => setDialog({ kind: "edit", user })}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="分配角色"
              onClick={() => setDialog({ kind: "roles", user })}
            >
              <UserCog className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="重置密码"
              onClick={() => setDialog({ kind: "reset", user })}
            >
              <KeyRound className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="删除"
              aria-label={`删除用户 ${user.username}`}
              onClick={() => setDialog({ kind: "delete", user })}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <ManagementPage
      title="组织身份控制台"
      description="统一维护成员身份、部门归属与权限边界，让每一个账号都处于清晰、可控的访问状态。"
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>用户目录</CardTitle>
          <Button onClick={() => setDialog({ kind: "create" })}>
            <Plus className="mr-1 size-4" />
            新增用户
          </Button>
        </CardHeader>
        <CardContent>
          <form
            className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearch(keyword.trim());
            }}
          >
            <Input
              aria-label="搜索用户"
              placeholder="搜索用户名"
              value={keyword}
              className="max-w-xs"
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as typeof status);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-32" aria-label="账号状态">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="enabled">仅看启用</SelectItem>
                  <SelectItem value="disabled">仅看停用</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">
              <Search className="mr-1 size-4" />
              搜索
            </Button>
          </form>
          <DataTable
            columns={columns}
            data={list}
            loading={usersQuery.isLoading}
            error={usersQuery.isError}
            emptyTitle="未找到用户"
            emptyDescription={
              search || status !== "all"
                ? "请调整筛选条件后重试。"
                : "新增用户后会显示在这里。"
            }
            onRetry={() => void usersQuery.refetch()}
            pagination={{
              page,
              pageSize: PAGE_SIZE,
              total: usersQuery.data?.total ?? 0,
              onChange: setPage,
            }}
          />
        </CardContent>

        {(dialog.kind === "create" || dialog.kind === "edit") && (
          <UserDialog
            editing={dialog.kind === "edit" ? dialog.user : undefined}
            deptOptions={deptOptions}
            saving={createMutation.isPending || updateMutation.isPending}
            onCancel={() => setDialog({ kind: "none" })}
            onCreate={(payload) => createMutation.mutate(payload)}
            onUpdate={(id, payload) => updateMutation.mutate({ id, payload })}
          />
        )}
        {dialog.kind === "roles" && detailQuery.data && (
          <AssignRolesDialog
            username={dialog.user.username}
            roles={rolesQuery.data?.list ?? []}
            selected={detailQuery.data.role_ids ?? []}
            saving={rolesMutation.isPending}
            onCancel={() => setDialog({ kind: "none" })}
            onSubmit={(roleIds) =>
              rolesMutation.mutate({ id: dialog.user.id, roleIds })
            }
          />
        )}
        {dialog.kind === "reset" && (
          <ResetPasswordDialog
            username={dialog.user.username}
            saving={resetMutation.isPending}
            onCancel={() => setDialog({ kind: "none" })}
            onSubmit={(password) =>
              resetMutation.mutate({ id: dialog.user.id, password })
            }
          />
        )}
        {dialog.kind === "delete" && (
          <DeleteUserDialog
            user={dialog.user}
            saving={removeMutation.isPending}
            onCancel={() => setDialog({ kind: "none" })}
            onConfirm={() => removeMutation.mutate(dialog.user.id)}
          />
        )}
      </Card>
    </ManagementPage>
  );
}
