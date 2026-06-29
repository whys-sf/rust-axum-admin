import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteConfirmDialog } from '@/components/common/delete-confirm-dialog'
import { StatusBadge } from "@/components/common/status-badge";
import { ManagementPage } from "@/components/common/management-page";
import { DataTable, type DataTableColumnDef } from "@/components/common/data-table";
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
  const columns = useMemo<DataTableColumnDef<DictType>[]>(
    () => [
      {
        header: "名称",
        meta: { cellClassName: "font-medium" },
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 group-hover:text-primary">
            {row.original.name}
            <ChevronRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        ),
      },
      {
        header: "编码",
        meta: { cellClassName: "font-mono text-xs text-muted-foreground" },
        cell: ({ row }) => row.original.code,
      },
      {
        header: "结构",
        cell: ({ row }) => (
          <Badge variant={row.original.is_tree ? "secondary" : "outline"}>
            {row.original.is_tree ? "树形" : "平铺"}
          </Badge>
        ),
      },
      {
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        header: "备注",
        meta: { cellClassName: "max-w-32 truncate text-xs text-muted-foreground" },
        cell: ({ row }) => row.original.remark ?? "—",
      },
      {
        header: "操作",
        className: "text-right",
        meta: { cellClassName: "text-right" },
        cell: ({ row }) => {
          const type = row.original;
          return (
            <div
              className="flex justify-end gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {canUpdate && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="编辑"
                  onClick={() => setDialog({ kind: "edit", type })}
                >
                  <Pencil className="size-4" />
                </Button>
              )}
              {canDelete && (
                <DeleteConfirmDialog
                  title="删除字典类型"
                  description="此操作会同时删除该字典下的所有字典项，且不可撤销。"
                  targetLabel="目标字典"
                  targetName={type.name}
                  onConfirm={() => removeMutation.mutateAsync(type.id)}
                  trigger={
                    <Button variant="ghost" size="icon" title="删除">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  }
                />
              )}
            </div>
          );
        },
      },
    ],
    [canDelete, canUpdate, removeMutation],
  );

  return (
    <ManagementPage
      title="数据字典控制台"
      description="维护系统枚举、标签和层级参考数据。点击字典类型查看其字典项。"
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>字典类型</CardTitle>
          {canCreate && (
            <Button onClick={() => setDialog({ kind: "create" })}>
              <Plus className="mr-1 size-4" />
              新增类型
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <form
            className="mb-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearch(keyword.trim());
            }}
          >
            <Input
              placeholder="按名称搜索"
              value={keyword}
              className="max-w-xs"
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Button type="submit" variant="secondary">
              <Search className="mr-1 size-4" />
              搜索
            </Button>
          </form>
          <DataTable
            columns={columns}
            data={list}
            loading={query.isLoading}
            error={query.isError}
            empty={list.length === 0}
            onRetry={() => void query.refetch()}
            rowClassName="cursor-pointer group"
            onRowClick={(type) =>
              navigate({
                to: "/dict/items",
                search: {
                  typeId: type.id,
                  typeName: type.name,
                  isTree: type.is_tree ? 1 : 0,
                  code: type.code,
                },
              })
            }
            pagination={{
              page,
              pageSize: PAGE_SIZE,
              total: query.data?.total ?? 0,
              onChange: setPage,
            }}
          />
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
