import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { userApi } from '@/lib/api/user'
import type { SendMessagePayload } from '@/lib/api/message'

interface ComposeDialogProps {
  saving: boolean
  onCancel: () => void
  onSubmit: (payload: SendMessagePayload) => void
}

export function ComposeDialog({
  saving,
  onCancel,
  onSubmit,
}: ComposeDialogProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [msgType, setMsgType] = useState(2)
  const [broadcast, setBroadcast] = useState(true)
  const [selected, setSelected] = useState<string[]>([])

  const usersQuery = useQuery({
    queryKey: ['users', 'compose'],
    queryFn: () => userApi.list({ page: 1, page_size: 100 }),
    enabled: !broadcast,
  })

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function submit() {
    onSubmit({
      title: title.trim(),
      content: content.trim() || undefined,
      msg_type: msgType,
      receiver_ids: broadcast ? [] : selected,
    })
  }

  const canSubmit =
    !!title.trim() && (broadcast || selected.length > 0) && !saving

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>发送消息</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>标题</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>类型</Label>
            <Select value={String(msgType)} onValueChange={(v) => setMsgType(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">系统通知</SelectItem>
                <SelectItem value="2">站内信</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>内容</Label>
            <Textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>发送给全部用户</Label>
            <Switch checked={broadcast} onCheckedChange={setBroadcast} />
          </div>
          {!broadcast && (
            <div className="space-y-1.5">
              <Label>选择收件人</Label>
              <div className="max-h-48 space-y-2 overflow-auto rounded-md border p-3">
                {usersQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">加载中...</p>
                ) : (
                  (usersQuery.data?.list ?? []).map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={selected.includes(u.id)}
                        onCheckedChange={() => toggle(u.id)}
                      />
                      <span>
                        {u.nickname || u.username}
                        <span className="ml-1 text-muted-foreground">
                          @{u.username}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            发送
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
