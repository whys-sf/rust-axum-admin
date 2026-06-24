import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumnDef } from '@/components/common/data-table'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { PERM, usePermission } from '@/lib/permissions'
import { messageApi } from '@/lib/api/message'
import type { SentMessage } from '@/lib/api/types'
import { ComposeDialog } from '@/features/messages/compose-dialog'

const PAGE_SIZE = 10

function typeLabel(t: number) {
  return t === 1 ? '系统通知' : '站内信'
}

export function SentPanel() {
  const qc = useQueryClient()
  const canCreate = usePermission(PERM.messageCreate)
  const canDelete = usePermission(PERM.messageDelete)

  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [composing, setComposing] = useState(false)

  const query = useQuery({
    queryKey: ['messages', { page, title: search }],
    queryFn: () =>
      messageApi.list({ page, page_size: PAGE_SIZE, title: search || undefined }),
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['messages'] })
    qc.invalidateQueries({ queryKey: ['inbox'] })
    qc.invalidateQueries({ queryKey: ['unread-count'] })
  }

  const sendMutation = useMutation({
    mutationFn: messageApi.send,
    onSuccess: () => {
      toast.success('已发送')
      invalidate()
      setComposing(false)
    },
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => messageApi.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      invalidate()
    },
  })

  const list = query.data?.list ?? []

  const columns: DataTableColumnDef<SentMessage>[] = [
    {
      accessorKey: 'title',
      header: '标题',
      cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    },
    {
      accessorKey: 'msg_type',
      header: '类型',
      cell: ({ row }) => <Badge variant="outline">{typeLabel(row.original.msg_type)}</Badge>,
    },
    {
      id: 'read_rate',
      header: '已读 / 收件人',
      cell: ({ row }) => `${row.original.read} / ${row.original.total}`,
    },
    {
      accessorKey: 'created_at',
      header: '发送时间',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{new Date(row.original.created_at).toLocaleString()}</span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      className: 'text-right',
      cell: ({ row }) => {
        const m = row.original
        return canDelete ? (
          <ConfirmDialog
            description={`确定删除消息「${m.title}」吗？此操作会同时删除所有收件箱副本。`}
            onConfirm={() => removeMutation.mutateAsync(m.id)}
            trigger={
              <Button variant="ghost" size="icon" title="删除">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            }
          />
        ) : null
      },
    },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setPage(1)
            setSearch(keyword.trim())
          }}
        >
          <Input
            placeholder="按标题搜索"
            value={keyword}
            className="max-w-xs"
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            <Search className="mr-1 size-4" />
            搜索
          </Button>
        </form>
        {canCreate && (
          <Button onClick={() => setComposing(true)}>
            <Plus className="mr-1 size-4" />
            发送消息
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={list}
        loading={query.isLoading}
        error={query.isError}
        onRetry={() => void query.refetch()}
        pagination={{ page, pageSize: PAGE_SIZE, total: query.data?.total ?? 0, onChange: setPage }}
      />
      {composing && (
        <ComposeDialog
          saving={sendMutation.isPending}
          onCancel={() => setComposing(false)}
          onSubmit={(payload) => sendMutation.mutate(payload)}
        />
      )}
    </div>
  )
}
