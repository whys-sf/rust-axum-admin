import { Fragment, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { StatusBadge } from '@/components/common/status-badge'
import { PagePagination } from '@/components/common/page-pagination'
import { PERM, usePermission } from '@/lib/permissions'
import {
  dictApi,
  type CreateDictItemPayload,
  type CreateDictTypePayload,
  type UpdateDictItemPayload,
  type UpdateDictTypePayload,
} from '@/lib/api/dict'
import type { DictItem, DictItemNode, DictType } from '@/lib/api/types'
import { DictTypeDialog } from '@/features/dict/dict-type-dialog'
import {
  DictItemDialog,
  type ItemOption,
} from '@/features/dict/dict-item-dialog'

const PAGE_SIZE = 10

const TAG_CLASS: Record<string, string> = {
  success:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  warning:
    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
}

function DictTag({ item }: { item: DictItem }) {
  const cls = item.list_class ? TAG_CLASS[item.list_class] : undefined
  if (!cls) return <span>{item.label}</span>
  return <Badge className={cn('border-transparent', cls)}>{item.label}</Badge>
}

/** Depth-tagged options for the parent picker in a tree dictionary. */
function flattenItems(
  nodes: DictItemNode[],
  depth = 0,
  acc: ItemOption[] = [],
): ItemOption[] {
  for (const node of nodes) {
    acc.push({ id: node.id, label: node.label, depth })
    if (node.children?.length) flattenItems(node.children, depth + 1, acc)
  }
  return acc
}

type TypeDialog =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; type: DictType }

type ItemDialog =
  | { kind: 'none' }
  | { kind: 'create'; parentId?: string }
  | { kind: 'edit'; item: DictItem }

export function DictPage() {
  const qc = useQueryClient()
  const canCreate = usePermission(PERM.dictCreate)
  const canUpdate = usePermission(PERM.dictUpdate)
  const canDelete = usePermission(PERM.dictDelete)

  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<DictType | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [typeDialog, setTypeDialog] = useState<TypeDialog>({ kind: 'none' })
  const [itemDialog, setItemDialog] = useState<ItemDialog>({ kind: 'none' })

  const typesQuery = useQuery({
    queryKey: ['dict-types', { page, name: search }],
    queryFn: () =>
      dictApi.listTypes({
        page,
        page_size: PAGE_SIZE,
        name: search || undefined,
      }),
  })

  const itemsQuery = useQuery({
    queryKey: ['dict-items', selected?.id],
    queryFn: () => dictApi.listItems(selected!.id),
    enabled: !!selected,
  })

  const itemOptions = useMemo(
    () => flattenItems(itemsQuery.data ?? []),
    [itemsQuery.data],
  )

  function invalidateTypes() {
    qc.invalidateQueries({ queryKey: ['dict-types'] })
  }
  function invalidateItems() {
    qc.invalidateQueries({ queryKey: ['dict-items', selected?.id] })
  }

  const saveTypeMutation = useMutation({
    mutationFn: (vars: {
      id?: string
      payload: CreateDictTypePayload | UpdateDictTypePayload
    }) =>
      vars.id
        ? dictApi.updateType(vars.id, vars.payload)
        : dictApi.createType(vars.payload as CreateDictTypePayload),
    onSuccess: (saved) => {
      toast.success('已保存')
      invalidateTypes()
      setTypeDialog({ kind: 'none' })
      if (selected?.id === saved.id) setSelected(saved)
    },
  })
  const removeTypeMutation = useMutation({
    mutationFn: (id: string) => dictApi.removeType(id),
    onSuccess: (_data, id) => {
      toast.success('已删除')
      invalidateTypes()
      if (selected?.id === id) setSelected(null)
    },
  })

  const saveItemMutation = useMutation({
    mutationFn: (vars: {
      id?: string
      payload: CreateDictItemPayload | UpdateDictItemPayload
    }) =>
      vars.id
        ? dictApi.updateItem(vars.id, vars.payload)
        : dictApi.createItem(vars.payload as CreateDictItemPayload),
    onSuccess: () => {
      toast.success('已保存')
      invalidateItems()
      setItemDialog({ kind: 'none' })
    },
  })
  const removeItemMutation = useMutation({
    mutationFn: (id: string) => dictApi.removeItem(id),
    onSuccess: () => {
      toast.success('已删除')
      invalidateItems()
    },
  })

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderItemRows(
    nodes: DictItemNode[],
    depth: number,
  ): React.ReactNode {
    return nodes.map((node) => {
      const hasChildren = (node.children?.length ?? 0) > 0
      const isOpen = expanded.has(node.id)
      const isTree = selected?.is_tree ?? false
      return (
        <Fragment key={node.id}>
          <TableRow>
            <TableCell>
              <div
                className="flex items-center"
                style={{ paddingLeft: isTree ? depth * 20 : 0 }}
              >
                {isTree ? (
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
                {isTree && canCreate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="新增子项"
                    onClick={() =>
                      setItemDialog({ kind: 'create', parentId: node.id })
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
                    onClick={() => setItemDialog({ kind: 'edit', item: node })}
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
          {isTree &&
            hasChildren &&
            isOpen &&
            renderItemRows(node.children, depth + 1)}
        </Fragment>
      )
    })
  }

  const types = typesQuery.data?.list ?? []

  return (
    <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>字典类型</CardTitle>
          {canCreate && (
            <Button size="sm" onClick={() => setTypeDialog({ kind: 'create' })}>
              <Plus className="mr-1 size-4" />
              新增
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <form
            className="mb-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setPage(1)
              setSearch(keyword.trim())
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称 / 编码</TableHead>
                <TableHead>类型</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : types.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                types.map((type) => (
                  <TableRow
                    key={type.id}
                    data-state={selected?.id === type.id ? 'selected' : undefined}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelected(type)
                      setExpanded(new Set())
                    }}
                  >
                    <TableCell>
                      <div className="font-medium">{type.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {type.code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.is_tree ? 'secondary' : 'outline'}>
                        {type.is_tree ? '树形' : '平铺'}
                      </Badge>
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
                            onClick={() => setTypeDialog({ kind: 'edit', type })}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <ConfirmDialog
                            description={`确定删除字典「${type.name}」及其所有字典项吗？`}
                            onConfirm={() =>
                              removeTypeMutation.mutateAsync(type.id)
                            }
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
                ))
              )}
            </TableBody>
          </Table>
          <PagePagination
            page={page}
            pageSize={PAGE_SIZE}
            total={typesQuery.data?.total ?? 0}
            onChange={setPage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            字典项
            {selected ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {selected.name}（{selected.is_tree ? '树形' : '平铺'}）
              </span>
            ) : null}
          </CardTitle>
          {selected && canCreate && (
            <Button size="sm" onClick={() => setItemDialog({ kind: 'create' })}>
              <Plus className="mr-1 size-4" />
              新增字典项
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!selected ? (
            <p className="py-12 text-center text-muted-foreground">
              请选择左侧字典类型查看字典项
            </p>
          ) : (
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
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : (itemsQuery.data?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      暂无字典项
                    </TableCell>
                  </TableRow>
                ) : (
                  renderItemRows(itemsQuery.data!, 0)
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(typeDialog.kind === 'create' || typeDialog.kind === 'edit') && (
        <DictTypeDialog
          editing={typeDialog.kind === 'edit' ? typeDialog.type : undefined}
          saving={saveTypeMutation.isPending}
          onCancel={() => setTypeDialog({ kind: 'none' })}
          onSubmit={(id, payload) => saveTypeMutation.mutate({ id, payload })}
        />
      )}
      {selected &&
        (itemDialog.kind === 'create' || itemDialog.kind === 'edit') && (
          <DictItemDialog
            dictCode={selected.code}
            isTree={selected.is_tree}
            parentOptions={itemOptions}
            editing={itemDialog.kind === 'edit' ? itemDialog.item : undefined}
            parentId={
              itemDialog.kind === 'create' ? itemDialog.parentId : undefined
            }
            saving={saveItemMutation.isPending}
            onCancel={() => setItemDialog({ kind: 'none' })}
            onSubmit={(id, payload) => saveItemMutation.mutate({ id, payload })}
          />
        )}
    </div>
  )
}
