import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Download, Search, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumnDef } from '@/components/common/data-table'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { ManagementPage } from '@/components/common/management-page'
import { PERM, usePermission } from '@/lib/permissions'
import { fileApi } from '@/lib/api/files'
import type { FileItem } from '@/lib/api/types'

const PAGE_SIZE = 10

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

export function FilesPage() {
  const qc = useQueryClient()
  const canUpload = usePermission(PERM.fileUpload)
  const canDelete = usePermission(PERM.fileDelete)

  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const query = useQuery({
    queryKey: ['files', { page, name: search }],
    queryFn: () =>
      fileApi.list({
        page,
        page_size: PAGE_SIZE,
        original_name: search || undefined,
      }),
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['files'] })
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => fileApi.upload(file, isPublic),
    onSuccess: () => {
      toast.success('上传成功')
      invalidate()
    },
    onSettled: () => {
      if (inputRef.current) inputRef.current.value = ''
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

  const list = query.data?.list ?? []

  const columns: DataTableColumnDef<FileItem>[] = [
    {
      accessorKey: 'original_name',
      header: '文件名',
      cell: ({ row }) => <span className="font-medium">{row.original.original_name}</span>,
    },
    {
      accessorKey: 'content_type',
      header: '类型',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.content_type}</span>
      ),
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
        <span className="text-muted-foreground">{new Date(row.original.created_at).toLocaleString()}</span>
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
            {canDelete && (
              <ConfirmDialog
                description={`确定删除文件「${item.original_name}」吗？`}
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
    <ManagementPage title="文件资产控制台" description="统一管理文件上传、存储状态和访问地址。">
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
              {uploadMutation.isPending ? '上传中...' : '上传文件'}
            </Button>
          </div>
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
            placeholder="按文件名搜索"
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
          onRetry={() => void query.refetch()}
          pagination={{ page, pageSize: PAGE_SIZE, total: query.data?.total ?? 0, onChange: setPage }}
        />
      </CardContent>
    </Card>
    </ManagementPage>
  )
}
