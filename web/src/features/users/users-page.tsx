import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ManagementPage } from "@/components/common/management-page";
import { PagePagination } from "@/components/common/page-pagination";
import { StatusBadge } from "@/components/common/status-badge";
import {
  userApi,
  type CreateUserPayload,
  type UpdateUserPayload,
} from "@/lib/api/user";
import { roleApi } from "@/lib/api/role";
import { deptApi } from "@/lib/api/dept";
import { flattenTree } from "@/lib/tree";
import { PERM, usePermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/api/types";
import { UserDialog } from "@/features/users/user-dialog";
import { AssignRolesDialog } from "@/features/users/assign-roles-dialog";
import { ResetPasswordDialog } from "@/features/users/reset-password-dialog";

const PAGE_SIZE = 10;

type DialogState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; user: User }
  | { kind: "roles"; user: User }
  | { kind: "reset"; user: User };

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
  const hasFilters = Boolean(search) || status !== "all";
  const enabledOnPage = list.filter((user) => user.status === 1).length;

  function resetFilters() {
    setKeyword("");
    setSearch("");
    setStatus("all");
    setPage(1);
  }

  return (
    <ManagementPage
      title="组织身份控制台"
      description="统一维护成员身份、部门归属与权限边界，让每一个账号都处于清晰、可控的访问状态。"
      metrics={[
        {
          label: "结果总数",
          value: String(usersQuery.data?.total ?? 0).padStart(2, "0"),
          caption: "当前筛选",
        },
        {
          label: "启用账号",
          value: String(enabledOnPage).padStart(2, "0"),
          caption: "当前页面",
        },
        {
          label: "组织单元",
          value: String(deptOptions.length).padStart(2, "0"),
          caption: "可选部门",
        },
      ]}
    >
      <Card
        size="sm"
        className="animate-in fade-in slide-in-from-bottom-2 duration-500"
      >
        <CardHeader>
          <CardTitle>用户目录</CardTitle>
          <CardDescription>账户状态与组织数据实时同步</CardDescription>
          <CardAction>
            <Button onClick={() => setDialog({ kind: "create" })}>
              <Plus data-icon="inline-start" />
              新增用户
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
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
              className="sm:max-w-72"
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
            <div className="flex items-center gap-2">
              <Button type="submit" variant="secondary">
                <Search data-icon="inline-start" />
                搜索
              </Button>
              {hasFilters && (
                <Button type="button" variant="ghost" onClick={resetFilters}>
                  <RotateCcw data-icon="inline-start" />
                  重置
                </Button>
              )}
            </div>
            <div className="hidden flex-1 sm:block" />
            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="刷新用户列表"
                title="刷新"
                disabled={usersQuery.isFetching}
                onClick={() => void usersQuery.refetch()}
              >
                <RefreshCw
                  className={cn(usersQuery.isFetching && "animate-spin")}
                />
              </Button>
            </div>
          </form>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead className="hidden md:table-cell">
                    联系方式
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">部门</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.isLoading ? (
                  Array.from({ length: 5 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-8 w-40" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-8 w-48" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto size-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : usersQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <span>用户数据加载失败</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void usersQuery.refetch()}
                        >
                          <RefreshCw data-icon="inline-start" />
                          重新加载
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Users className="size-8" />
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">
                            未找到用户
                          </span>
                          <span>
                            {hasFilters
                              ? "请调整筛选条件后重试。"
                              : "新增用户后会显示在这里。"}
                          </span>
                        </div>
                        {hasFilters && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetFilters}
                          >
                            <RotateCcw data-icon="inline-start" />
                            清除筛选
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8 sm:size-10">
                            {user.avatar && (
                              <AvatarImage src={user.avatar} alt="" />
                            )}
                            <AvatarFallback>
                              {(user.nickname || user.username)
                                .slice(0, 1)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="font-mono text-[0.65rem] tracking-widest text-muted-foreground">
                              USR-
                              {String(
                                (page - 1) * PAGE_SIZE + index + 1,
                              ).padStart(3, "0")}
                            </span>
                            <div className="truncate font-medium">
                              {user.nickname || user.username}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex max-w-64 flex-col gap-0.5">
                          <span className="truncate">
                            {user.email || "未设置邮箱"}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {user.phone || "未设置手机号"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {user.dept_id
                          ? (deptName.get(user.dept_id) ?? "未分配")
                          : "未分配"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            aria-label={`${user.status === 1 ? "停用" : "启用"}用户 ${user.username}`}
                            checked={user.status === 1}
                            disabled={statusMutation.isPending}
                            onCheckedChange={(checked) =>
                              statusMutation.mutate({
                                id: user.id,
                                status: checked ? 1 : 0,
                              })
                            }
                          />
                          <div className="hidden sm:block">
                            <StatusBadge status={user.status} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`管理用户 ${user.username}`}
                              >
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>账号操作</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onSelect={() =>
                                    setDialog({ kind: "edit", user })
                                  }
                                >
                                  <Pencil />
                                  编辑资料
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() =>
                                    setDialog({ kind: "roles", user })
                                  }
                                >
                                  <UserCog />
                                  分配角色
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() =>
                                    setDialog({ kind: "reset", user })
                                  }
                                >
                                  <KeyRound />
                                  重置密码
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <ConfirmDialog
                            description={`确定删除用户「${user.username}」吗？此操作不可撤销。`}
                            onConfirm={() =>
                              removeMutation.mutateAsync(user.id)
                            }
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`删除用户 ${user.username}`}
                                title="删除"
                              >
                                <Trash2 />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter>
          <div className="w-full">
            <PagePagination
              page={page}
              pageSize={PAGE_SIZE}
              total={usersQuery.data?.total ?? 0}
              onChange={setPage}
            />
          </div>
        </CardFooter>

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
      </Card>
    </ManagementPage>
  );
}
