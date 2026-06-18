import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCheck, Mail, MailOpen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>标题</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>发件人</TableHead>
            <TableHead>时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                加载中...
              </TableCell>
            </TableRow>
          ) : list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                暂无消息
              </TableCell>
            </TableRow>
          ) : (
            list.map((m: InboxItem) => (
              <TableRow
                key={m.message_id}
                className={m.is_read ? undefined : 'font-medium'}
              >
                <TableCell>
                  {m.is_read ? (
                    <MailOpen className="size-4 text-muted-foreground" />
                  ) : (
                    <Mail className="size-4 text-primary" />
                  )}
                </TableCell>
                <TableCell>
                  <button
                    className="text-left hover:underline"
                    onClick={() => setViewing(m.message_id)}
                  >
                    {m.title}
                  </button>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{typeLabel(m.msg_type)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {m.sender_name ?? '系统'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(m.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <ConfirmDialog
                    description={`确定删除消息「${m.title}」吗？`}
                    onConfirm={() => removeMutation.mutateAsync(m.message_id)}
                    trigger={
                      <Button variant="ghost" size="icon" title="删除">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    }
                  />
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
