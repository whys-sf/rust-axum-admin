import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Copy,
  Download,
  Folder,
  FolderOpen,
  FolderPlus,
  Image,
  MoreHorizontal,
  MoveRight,
  Pencil,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable, type DataTableColumnDef } from '@/components/common/data-table'
import { DeleteConfirmDialog } from '@/components/common/delete-confirm-dialog'
import { DialogHeroHeader } from '@/components/common/dialog-hero-header'
import { ManagementPage } from '@/components/common/management-page'
import { PERM, usePermission } from '@/lib/permissions'
import { fileApi } from '@/lib/api/files'
import type { FileFolder, FileItem } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10
const ROOT_FOLDER = '__root__'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${value.toFixed(1)} ${units[i]}`
}

function folderValue(id?: string | null) {
  return id || ROOT_FOLDER
}

function folderIdFromValue(value: string) {
  return value === ROOT_FOLDER ? null : value
}

interface FolderDialogProps {
  editing?: FileFolder
  saving: boolean
  onCancel: () => void
  onSubmit: (name: string) => void
}

function FolderDialog({ editing, saving, onCancel, onSubmit }: FolderDialogProps) {
  const [name, setName] = useState(editing?.name ?? '')

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-lg dark:ring-white/10"
      >
        <DialogHeroHeader
          icon={FolderPlus}
          eyebrow={editing ? '文件夹更新' : '新增文件夹'}
          title={editing ? '重命名文件夹' : '创建图片文件夹'}
          description="使用文件夹归类图片与附件，上传和移动时都可以指定归属。"
        />
        <div className="px-5 py-7 sm:px-7">
          <div className="space-y-2">
            <Label htmlFor="folder-name">文件夹名称</Label>
            <Input
              id="folder-name"
              autoFocus
              value={name}
              placeholder="如 产品图、登录背景、活动素材"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && name.trim()) {
                  onSubmit(name.trim())
                }
              }}
            />
          </div>
        </div>
        <DialogFooter className="mx-0 mb-0 mt-auto flex-row items-center justify-end rounded-none px-5 py-4 sm:px-7">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            取消
          </Button>
          <Button onClick={() => onSubmit(name.trim())} disabled={saving || !name.trim()}>
            {editing ? '保存名称' : '创建文件夹'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface MoveDialogProps {
  file: FileItem
  folders: FileFolder[]
  saving: boolean
  onCancel: () => void
  onSubmit: (folderId: string | null) => void
}

function MoveDialog({ file, folders, saving, onCancel, onSubmit }: MoveDialogProps) {
  const [folderId, setFolderId] = useState(folderValue(file.folder_id))

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-lg dark:ring-white/10"
      >
        <DialogHeroHeader
          icon={MoveRight}
          eyebrow="移动文件"
          title="调整文件归属"
          description="选择新的目标文件夹，文件访问地址和存储对象不会变化。"
          aside={
            <div className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-background text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
              <FolderOpen className="size-5 text-primary" />
            </div>
          }
        />
        <div className="space-y-5 px-5 py-7 sm:px-7">
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">目标文件</p>
            <p className="mt-1 break-all text-base font-semibold">{file.original_name}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="file-folder">目标文件夹</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger id="file-folder">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT_FOLDER}>未归档</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mx-0 mb-0 mt-auto flex-row items-center justify-end rounded-none px-5 py-4 sm:px-7">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            取消
          </Button>
          <Button onClick={() => onSubmit(folderIdFromValue(folderId))} disabled={saving}>
            移动文件
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function FilesPage() {
  const qc = useQueryClient()
  const canUpload = usePermission(PERM.fileUpload)
  const canDelete = usePermission(PERM.fileDelete)

  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [folderId, setFolderId] = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(false)
  const [folderDialog, setFolderDialog] = useState<FileFolder | 'create' | null>(null)
  const [moving, setMoving] = useState<FileItem | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const foldersQuery = useQuery({
    queryKey: ['file-folders'],
    queryFn: fileApi.folders,
  })

  const query = useQuery({
    queryKey: ['files', { page, name: search, folderId }],
    queryFn: () =>
      fileApi.list({
        page,
        page_size: PAGE_SIZE,
        original_name: search || undefined,
        folder_id: folderId || undefined,
      }),
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['files'] })
    qc.invalidateQueries({ queryKey: ['file-folders'] })
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => fileApi.upload(file, isPublic, folderId),
    onSuccess: () => {
      toast.success('上传成功')
      invalidate()
    },
    onSettled: () => {
      if (inputRef.current) inputRef.current.value = ''
    },
  })

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => fileApi.createFolder(name),
    onSuccess: () => {
      toast.success('文件夹已创建')
      invalidate()
      setFolderDialog(null)
    },
  })

  const updateFolderMutation = useMutation({
    mutationFn: (vars: { id: string; name: string }) =>
      fileApi.updateFolder(vars.id, vars.name),
    onSuccess: () => {
      toast.success('文件夹已更新')
      invalidate()
      setFolderDialog(null)
    },
  })

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => fileApi.deleteFolder(id),
    onSuccess: (_, id) => {
      toast.success('文件夹已删除')
      if (folderId === id) {
        setFolderId(null)
        setPage(1)
      }
      invalidate()
    },
  })

  const moveMutation = useMutation({
    mutationFn: (vars: { id: string; folderId: string | null }) =>
      fileApi.move(vars.id, vars.folderId),
    onSuccess: () => {
      toast.success('文件已移动')
      invalidate()
      setMoving(null)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => fileApi.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      invalidate()
    },
  })

  function copyUrl(item: FileItem) {
    const url = `${window.location.origin}${item.url}`
    navigator.clipboard.writeText(url).then(
      () => toast.success('链接已复制'),
      () => toast.error('复制失败'),
    )
  }

  const folders = foldersQuery.data ?? []
  const list = query.data?.list ?? []
  const currentFolder = folders.find((folder) => folder.id === folderId)
  const rootCount = folderId ? null : (query.data?.total ?? 0)

  const folderName = useMemo(() => currentFolder?.name ?? '未归档', [currentFolder])

  const columns: DataTableColumnDef<FileItem>[] = [
    {
      accessorKey: 'original_name',
      header: '文件名',
      cell: ({ row }) => {
        const item = row.original
        const isImage = item.content_type.startsWith('image/')
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
              {isImage ? (
                <img src={item.url} alt="" className="size-full object-cover" />
              ) : (
                <Image className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{item.original_name}</p>
              <p className="text-xs text-muted-foreground">{item.content_type}</p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'size',
      header: '大小',
      cell: ({ row }) => formatSize(row.original.size),
    },
    {
      accessorKey: 'is_public',
      header: '访问',
      cell: ({ row }) =>
        row.original.is_public ? (
          <Badge variant="secondary">公开</Badge>
        ) : (
          <Badge variant="outline">私有</Badge>
        ),
    },
    {
      accessorKey: 'created_at',
      header: '上传时间',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {new Date(row.original.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      className: 'text-right',
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" title="下载" onClick={() => fileApi.download(item)}>
              <Download className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" title="复制链接" onClick={() => copyUrl(item)}>
              <Copy className="size-4" />
            </Button>
            {canUpload && (
              <Button variant="ghost" size="icon" title="移动" onClick={() => setMoving(item)}>
                <MoveRight className="size-4" />
              </Button>
            )}
            {canDelete && (
              <DeleteConfirmDialog
                title="删除文件"
                description="此操作不可撤销，请确认后继续。"
                targetLabel="目标文件"
                targetName={item.original_name}
                onConfirm={() => removeMutation.mutateAsync(item.id)}
                trigger={
                  <Button variant="ghost" size="icon" title="删除">
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                }
              />
            )}
          </div>
        )
      },
    },
  ]

  return (
    <ManagementPage title="图片资产控制台" description="用文件夹管理图片与附件，支持上传、移动、下载和公开访问。">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>文件管理</CardTitle>
          {canUpload && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="file-public" className="text-sm">
                  公开访问
                </Label>
                <Switch
                  id="file-public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadMutation.mutate(file)
                }}
              />
              <Button
                onClick={() => inputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                <Upload className="mr-1 size-4" />
                {uploadMutation.isPending ? '上传中...' : `上传到${folderName}`}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="rounded-xl border bg-muted/10 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">文件夹</h3>
                  <p className="text-xs text-muted-foreground">按用途归类图片素材</p>
                </div>
                {canUpload && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="创建文件夹"
                    onClick={() => setFolderDialog('create')}
                  >
                    <FolderPlus className="size-4" />
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setFolderId(null)
                    setPage(1)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted',
                    !folderId && 'bg-primary text-primary-foreground hover:bg-primary',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FolderOpen className="size-4 shrink-0" />
                    <span className="truncate">未归档</span>
                  </span>
                  {rootCount !== null && <span className="text-xs opacity-70">{rootCount}</span>}
                </button>
                {folders.map((folder) => (
                  <div key={folder.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => {
                        setFolderId(folder.id)
                        setPage(1)
                      }}
                      className={cn(
                        'flex w-full min-w-0 items-center justify-between rounded-lg py-2 pr-11 pl-3 text-left text-sm hover:bg-muted',
                        folderId === folder.id && 'bg-primary text-primary-foreground hover:bg-primary',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Folder className="size-4 shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </span>
                      <span className="text-xs opacity-70">{folder.file_count}</span>
                    </button>
                    {(canUpload || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="更多操作"
                            className={cn(
                              'absolute top-1/2 right-1 size-8 -translate-y-1/2 opacity-0 group-hover:opacity-100',
                              folderId === folder.id &&
                                'text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground',
                            )}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          {canUpload && (
                            <DropdownMenuItem onClick={() => setFolderDialog(folder)}>
                              <Pencil className="size-4" />
                              重命名
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DeleteConfirmDialog
                              title="删除文件夹"
                              description="只能删除空文件夹。文件夹内仍有文件时，请先移动或删除文件。"
                              targetLabel="目标文件夹"
                              targetName={folder.name}
                              targetDescription={`${folder.file_count} 个文件`}
                              onConfirm={() => deleteFolderMutation.mutateAsync(folder.id)}
                              trigger={
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={(event) => event.preventDefault()}
                                >
                                  <Trash2 className="size-4" />
                                  删除
                                </DropdownMenuItem>
                              }
                            />
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            </aside>

            <section className="min-w-0">
              <form
                className="mb-4 flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  setPage(1)
                  setSearch(keyword.trim())
                }}
              >
                <Input
                  placeholder={`在${folderName}中搜索文件名`}
                  value={keyword}
                  className="max-w-xs"
                  onChange={(e) => setKeyword(e.target.value)}
                />
                <Button type="submit" variant="secondary">
                  <Search className="mr-1 size-4" />
                  搜索
                </Button>
                <Badge variant="outline" className="ml-auto">
                  当前：{folderName}
                </Badge>
              </form>
              <DataTable
                columns={columns}
                data={list}
                loading={query.isLoading || foldersQuery.isLoading}
                error={query.isError}
                onRetry={() => void query.refetch()}
                emptyTitle="暂无文件"
                pagination={{
                  page,
                  pageSize: PAGE_SIZE,
                  total: query.data?.total ?? 0,
                  onChange: setPage,
                }}
              />
            </section>
          </div>
        </CardContent>
      </Card>

      {folderDialog && (
        <FolderDialog
          editing={folderDialog === 'create' ? undefined : folderDialog}
          saving={createFolderMutation.isPending || updateFolderMutation.isPending}
          onCancel={() => setFolderDialog(null)}
          onSubmit={(name) => {
            if (folderDialog === 'create') createFolderMutation.mutate(name)
            else updateFolderMutation.mutate({ id: folderDialog.id, name })
          }}
        />
      )}
      {moving && (
        <MoveDialog
          file={moving}
          folders={folders}
          saving={moveMutation.isPending}
          onCancel={() => setMoving(null)}
          onSubmit={(targetFolderId) =>
            moveMutation.mutate({ id: moving.id, folderId: targetFolderId })
          }
        />
      )}
    </ManagementPage>
  )
}
