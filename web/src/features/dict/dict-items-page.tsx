import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DataTable,
  type DataTableColumnDef,
} from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ManagementPage } from "@/components/common/management-page";
import { PERM, usePermission } from "@/lib/permissions";
import {
  dictApi,
  type CreateDictItemPayload,
  type UpdateDictItemPayload,
} from "@/lib/api/dict";
import type { DictItem, DictItemNode } from "@/lib/api/types";
import {
  DictItemDialog,
  type ItemOption,
} from "@/features/dict/dict-item-dialog";

const TAG_CLASS: Record<string, string> = {
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  warning:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
};

function DictTag({ item }: { item: DictItem }) {
  const cls = item.list_class ? TAG_CLASS[item.list_class] : undefined;
  if (!cls) return <span>{item.label}</span>;
  return <Badge className={cn("border-transparent", cls)}>{item.label}</Badge>;
}

function flattenItems(
  nodes: DictItemNode[],
  depth = 0,
  acc: ItemOption[] = [],
): ItemOption[] {
  for (const node of nodes) {
    acc.push({ id: node.id, label: node.label, depth });
    if (node.children?.length) flattenItems(node.children, depth + 1, acc);
  }
  return acc;
}

type ItemDialog =
  | { kind: "none" }
  | { kind: "create"; parentId?: string }
  | { kind: "edit"; item: DictItem };

interface DictItemTableRow {
  node: DictItemNode;
  depth: number;
}

export function DictItemsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canCreate = usePermission(PERM.dictCreate);
  const canUpdate = usePermission(PERM.dictUpdate);
  const canDelete = usePermission(PERM.dictDelete);

  // Read type info from URL search params (type-safe via validateSearch)
  const { typeId, typeName, isTree, code } = useSearch({
    from: '/_app/dict/items',
  });

  const isTreeBool = isTree === 1;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [itemDialog, setItemDialog] = useState<ItemDialog>({ kind: "none" });

  const itemsQuery = useQuery({
    queryKey: ["dict-items", typeId],
    queryFn: () => dictApi.listItems(typeId),
    enabled: !!typeId,
  });

  const itemOptions = useMemo(
    () => flattenItems(itemsQuery.data ?? []),
    [itemsQuery.data],
  );

  function invalidateItems() {
    qc.invalidateQueries({ queryKey: ["dict-items", typeId] });
  }

  const saveItemMutation = useMutation({
    mutationFn: (vars: {
      id?: string;
      payload: CreateDictItemPayload | UpdateDictItemPayload;
    }) =>
      vars.id
        ? dictApi.updateItem(vars.id, vars.payload)
        : dictApi.createItem(vars.payload as CreateDictItemPayload),
    onSuccess: () => {
      toast.success("已保存");
      invalidateItems();
      setItemDialog({ kind: "none" });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (id: string) => dictApi.removeItem(id),
    onSuccess: () => {
      toast.success("已删除");
      invalidateItems();
    },
  });

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const rows = useMemo(() => {
    const visibleRows: DictItemTableRow[] = [];
    function walk(nodes: DictItemNode[], depth: number) {
      for (const node of nodes) {
        visibleRows.push({ node, depth });
        if (
          isTreeBool &&
          (node.children?.length ?? 0) > 0 &&
          expanded.has(node.id)
        ) {
          walk(node.children, depth + 1);
        }
      }
    }
    walk(itemsQuery.data ?? [], 0);
    return visibleRows;
  }, [expanded, isTreeBool, itemsQuery.data]);

  const columns = useMemo<DataTableColumnDef<DictItemTableRow>[]>(
    () => [
      {
        header: "标签",
        cell: ({ row }) => {
          const { node, depth } = row.original;
          const hasChildren = (node.children?.length ?? 0) > 0;
          const isOpen = expanded.has(node.id);
          return (
            <div
              className="flex items-center"
              style={{ paddingLeft: isTreeBool ? depth * 20 : 0 }}
            >
              {isTreeBool ? (
                hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggle(node.id)}
                    className="mr-1 text-muted-foreground hover:text-foreground"
                  >
                    {isOpen ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>
                ) : (
                  <span className="mr-1 inline-block size-4" />
                )
              ) : null}
              <DictTag item={node} />
            </div>
          );
        },
      },
      {
        header: "键值",
        meta: { cellClassName: "font-mono text-muted-foreground" },
        cell: ({ row }) => row.original.node.value,
      },
      {
        header: "排序",
        cell: ({ row }) => row.original.node.sort,
      },
      {
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.node.status} />,
      },
      {
        header: "操作",
        className: "text-right",
        meta: { cellClassName: "text-right" },
        cell: ({ row }) => {
          const { node } = row.original;
          return (
            <div className="flex justify-end gap-1">
              {isTreeBool && canCreate && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="新增子项"
                  onClick={() =>
                    setItemDialog({ kind: "create", parentId: node.id })
                  }
                >
                  <Plus className="size-4" />
                </Button>
              )}
              {canUpdate && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="编辑"
                  onClick={() => setItemDialog({ kind: "edit", item: node })}
                >
                  <Pencil className="size-4" />
                </Button>
              )}
              {canDelete && (
                <ConfirmDialog
                  description={`确定删除字典项「${node.label}」吗？`}
                  onConfirm={() => removeItemMutation.mutateAsync(node.id)}
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
    [
      canCreate,
      canDelete,
      canUpdate,
      expanded,
      isTreeBool,
      removeItemMutation,
    ],
  );

  return (
    <ManagementPage
      title="字典项管理"
      description={`字典「${typeName}」下的所有字典项。`}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              title="返回"
              onClick={() => navigate({ to: "/dict" })}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex min-w-0 items-center gap-2">
              <CardTitle className="truncate">{typeName}</CardTitle>
              <span className="font-mono text-xs text-muted-foreground">
                {code}
              </span>
              <Badge variant={isTreeBool ? "secondary" : "outline"}>
                {isTreeBool ? "树形" : "平铺"}
              </Badge>
            </div>
          </div>
          {canCreate && (
            <Button onClick={() => setItemDialog({ kind: "create" })}>
              <Plus className="mr-1 size-4" />
              新增字典项
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            loading={itemsQuery.isLoading}
            empty={(itemsQuery.data?.length ?? 0) === 0 && !itemsQuery.isLoading}
            emptyTitle="暂无字典项"
          />
        </CardContent>
      </Card>

      {/* Dialog */}
      {(itemDialog.kind === "create" || itemDialog.kind === "edit") && (
        <DictItemDialog
          dictCode={code}
          isTree={isTreeBool}
          parentOptions={itemOptions}
          editing={itemDialog.kind === "edit" ? itemDialog.item : undefined}
          parentId={
            itemDialog.kind === "create" ? itemDialog.parentId : undefined
          }
          saving={saveItemMutation.isPending}
          onCancel={() => setItemDialog({ kind: "none" })}
          onSubmit={(id, payload) => saveItemMutation.mutate({ id, payload })}
        />
      )}
    </ManagementPage>
  );
}
