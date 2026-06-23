import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  Trees,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
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

  function renderItemRows(
    nodes: DictItemNode[],
    depth: number,
  ): React.ReactNode {
    return nodes.map((node) => {
      const hasChildren = (node.children?.length ?? 0) > 0;
      const isOpen = expanded.has(node.id);
      return (
        <Fragment key={node.id}>
          <TableRow>
            <TableCell>
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
            </TableCell>
            <TableCell className="font-mono text-muted-foreground">
              {node.value}
            </TableCell>
            <TableCell>{node.sort}</TableCell>
            <TableCell>
              <StatusBadge status={node.status} />
            </TableCell>
            <TableCell className="text-right">
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
            </TableCell>
          </TableRow>
          {isTreeBool &&
            hasChildren &&
            isOpen &&
            renderItemRows(node.children, depth + 1)}
        </Fragment>
      );
    });
  }

  return (
    <ManagementPage
      title="字典项管理"
      description={`字典「${typeName}」下的所有字典项。`}
    >
      <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden rounded-xl border-0 shadow-sm ring-1 ring-black/6 dark:ring-white/8">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => navigate({ to: "/dict" })}
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Trees className="size-4 text-primary" />
                <span className="text-sm font-semibold">{typeName}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {code}
                </span>
                <Badge
                  variant={isTreeBool ? "secondary" : "outline"}
                  className="scale-90 px-1.5 py-0 text-[10px]"
                >
                  {isTreeBool ? "树形" : "平铺"}
                </Badge>
              </div>
            </div>
            {canCreate && (
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setItemDialog({ kind: "create" })}
              >
                <Plus className="size-3.5" />
                新增字典项
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="px-2 pt-4 sm:px-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标签</TableHead>
                  <TableHead>键值</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsQuery.isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <LoaderCircle className="mx-auto mb-2 size-5 animate-spin" />
                      加载中…
                    </TableCell>
                  </TableRow>
                ) : (itemsQuery.data?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <BookOpen className="mx-auto mb-2 size-6 opacity-30" />
                      暂无字典项
                    </TableCell>
                  </TableRow>
                ) : (
                  renderItemRows(itemsQuery.data!, 0)
                )}
              </TableBody>
            </Table>
          </div>
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
