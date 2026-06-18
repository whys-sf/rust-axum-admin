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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { PagePagination } from '@/components/common/page-pagination'
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

  return (
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>文件名</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>大小</TableHead>
              <TableHead>访问</TableHead>
              <TableHead>上传时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  加载中...
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              list.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.original_name}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.content_type}
                  </TableCell>
                  <TableCell>{formatSize(item.size)}</TableCell>
                  <TableCell>
                    {item.is_public ? (
                      <Badge variant="secondary">公开</Badge>
                    ) : (
                      <Badge variant="outline">私有</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="下载"
                        onClick={() => fileApi.download(item)}
                      >
                        <Download className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="复制链接"
                        onClick={() => copyUrl(item)}
                      >
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <PagePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={query.data?.total ?? 0}
          onChange={setPage}
        />
      </CardContent>
    </Card>
  )
}
