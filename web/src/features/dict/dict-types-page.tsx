import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { PagePagination } from "@/components/common/page-pagination";
import { ManagementPage } from "@/components/common/management-page";
import { PERM, usePermission } from "@/lib/permissions";
import {
  dictApi,
  type CreateDictTypePayload,
  type UpdateDictTypePayload,
} from "@/lib/api/dict";
import type { DictType } from "@/lib/api/types";
import { DictTypeDialog } from "@/features/dict/dict-type-dialog";

const PAGE_SIZE = 10;

type DialogState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; type: DictType };

export function DictTypesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canCreate = usePermission(PERM.dictCreate);
  const canUpdate = usePermission(PERM.dictUpdate);
  const canDelete = usePermission(PERM.dictDelete);

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  const query = useQuery({
    queryKey: ["dict-types", { page, name: search }],
    queryFn: () =>
      dictApi.listTypes({
        page,
        page_size: PAGE_SIZE,
        name: search || undefined,
      }),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["dict-types"] });
  }

  const saveMutation = useMutation({
    mutationFn: (vars: {
      id?: string;
      payload: CreateDictTypePayload | UpdateDictTypePayload;
    }) =>
      vars.id
        ? dictApi.updateType(vars.id, vars.payload)
        : dictApi.createType(vars.payload as CreateDictTypePayload),
    onSuccess: () => {
      toast.success("已保存");
      invalidate();
      setDialog({ kind: "none" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => dictApi.removeType(id),
    onSuccess: () => {
      toast.success("已删除");
      invalidate();
    },
  });

  const list = query.data?.list ?? [];

  return (
    <ManagementPage
      title="数据字典控制台"
      description="维护系统枚举、标签和层级参考数据。点击字典类型查看其字典项。"
    >
      <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden rounded-xl border-0 shadow-sm ring-1 ring-black/6 dark:ring-white/8">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              <span className="text-sm font-semibold">字典类型</span>
              <span className="text-xs text-muted-foreground">
                共 {query.data?.total ?? 0} 条
              </span>
            </div>
            {canCreate && (
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setDialog({ kind: "create" })}
              >
                <Plus className="size-3.5" />
                新增类型
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="px-5 pt-4 sm:px-6">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                setSearch(keyword.trim());
              }}
            >
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  placeholder="按名称搜索"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="h-9 bg-muted/25 pl-9 text-sm"
                />
              </div>
            </form>
          </div>

          {/* Table */}
          <div className="px-2 pt-4 sm:px-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>编码</TableHead>
                  <TableHead>结构</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <LoaderCircle className="mx-auto mb-2 size-5 animate-spin" />
                      加载中…
                    </TableCell>
                  </TableRow>
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground"
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((type) => (
                    <TableRow
                      key={type.id}
                      className="cursor-pointer group"
                      onClick={() =>
                        navigate({
                          to: "/dict/items",
                          search: { typeId: type.id, typeName: type.name, isTree: type.is_tree ? 1 : 0, code: type.code },
                        })
                      }
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5 group-hover:text-primary">
                          {type.name}
                          <ChevronRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {type.code}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={type.is_tree ? "secondary" : "outline"}
                        >
                          {type.is_tree ? "树形" : "平铺"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={type.status} />
                      </TableCell>
                      <TableCell className="max-w-32 truncate text-xs text-muted-foreground">
                        {type.remark ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="编辑"
                              onClick={() =>
                                setDialog({ kind: "edit", type })
                              }
                            >
                              <Pencil className="size-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <ConfirmDialog
                              description={`确定删除字典「${type.name}」及其所有字典项吗？`}
                              onConfirm={() =>
                                removeMutation.mutateAsync(type.id)
                              }
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="删除"
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              }
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="px-5 pb-4 pt-2 sm:px-6">
            <PagePagination
              page={page}
              pageSize={PAGE_SIZE}
              total={query.data?.total ?? 0}
              onChange={setPage}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      {(dialog.kind === "create" || dialog.kind === "edit") && (
        <DictTypeDialog
          editing={dialog.kind === "edit" ? dialog.type : undefined}
          saving={saveMutation.isPending}
          onCancel={() => setDialog({ kind: "none" })}
          onSubmit={(id, payload) => saveMutation.mutate({ id, payload })}
        />
      )}
    </ManagementPage>
  );
}
