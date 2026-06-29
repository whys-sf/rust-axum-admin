import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCheck,
  Mail,
  MailOpen,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteConfirmDialog } from '@/components/common/delete-confirm-dialog'
import { DataTable, type DataTableColumnDef } from '@/components/common/data-table'
import { messageApi } from '@/lib/api/message'
import type { InboxItem } from '@/lib/api/types'
import { MessageViewDialog } from '@/features/messages/message-view-dialog'

const PAGE_SIZE = 10

function typeLabel(t: number) {
  return t === 1 ? '系统通知' : '站内信'
}

export function InboxPanel() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['inbox', { page }],
    queryFn: () => messageApi.inbox({ page, page_size: PAGE_SIZE }),
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['inbox'] })
    qc.invalidateQueries({ queryKey: ['unread-count'] })
  }

  const markAllMutation = useMutation({
    mutationFn: () => messageApi.markAllRead(),
    onSuccess: () => {
      toast.success('已全部标记为已读')
      invalidate()
    },
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => messageApi.removeFromInbox(id),
    onSuccess: () => {
      toast.success('已删除')
      invalidate()
    },
  })

  const list = query.data?.list ?? []
  const columns: DataTableColumnDef<InboxItem>[] = [
    {
      id: 'read',
      header: '',
      className: 'w-10',
      cell: ({ row }) =>
        row.original.is_read ? (
          <MailOpen className="size-4 text-muted-foreground" />
        ) : (
          <Mail className="size-4 text-primary" />
        ),
    },
    {
      accessorKey: 'title',
      header: '标题',
      cell: ({ row }) => (
        <button
          className="text-left hover:underline"
          onClick={() => setViewing(row.original.message_id)}
        >
          {row.original.title}
        </button>
      ),
    },
    {
      accessorKey: 'msg_type',
      header: '类型',
      cell: ({ row }) => (
        <Badge variant="outline">{typeLabel(row.original.msg_type)}</Badge>
      ),
    },
    {
      accessorKey: 'sender_name',
      header: '发件人',
      meta: { cellClassName: 'text-muted-foreground' },
      cell: ({ row }) => row.original.sender_name ?? '系统',
    },
    {
      accessorKey: 'created_at',
      header: '时间',
      meta: { cellClassName: 'text-muted-foreground' },
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
    {
      id: 'actions',
      header: '操作',
      className: 'text-right',
      meta: { cellClassName: 'text-right' },
      cell: ({ row }) => (
        <DeleteConfirmDialog
          title="删除收件消息"
          description="此操作只会从当前收件箱移除该消息。"
          targetLabel="目标消息"
          targetName={row.original.title}
          onConfirm={() => removeMutation.mutateAsync(row.original.message_id)}
          trigger={
            <Button variant="ghost" size="icon" title="删除">
              <Trash2 className="size-4 text-destructive" />
            </Button>
          }
        />
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          variant="secondary"
          disabled={markAllMutation.isPending}
          onClick={() => markAllMutation.mutate()}
        >
          <CheckCheck className="mr-1 size-4" />
          全部已读
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={list}
        loading={query.isLoading}
        error={query.isError}
        emptyTitle="暂无消息"
        onRetry={() => void query.refetch()}
        rowClassName={(row) => (row.original.is_read ? undefined : 'font-medium')}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total: query.data?.total ?? 0,
          onChange: setPage,
        }}
      />
      {viewing && (
        <MessageViewDialog
          messageId={viewing}
          onClose={() => setViewing(null)}
          onRead={invalidate}
        />
      )}
    </div>
  )
}
