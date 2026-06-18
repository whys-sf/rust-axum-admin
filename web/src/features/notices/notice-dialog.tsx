import { useState } from 'react'
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
import type { CreateNoticePayload } from '@/lib/api/notice'
import type { Notice } from '@/lib/api/types'

interface NoticeDialogProps {
  editing?: Notice
  saving: boolean
  onCancel: () => void
  onSubmit: (id: string | undefined, payload: CreateNoticePayload) => void
}

export function NoticeDialog({
  editing,
  saving,
  onCancel,
  onSubmit,
}: NoticeDialogProps) {
  const [form, setForm] = useState<CreateNoticePayload>({
    title: editing?.title ?? '',
    notice_type: editing?.notice_type ?? 1,
    content: editing?.content ?? '',
    status: editing?.status ?? 1,
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? '编辑公告' : '新增公告'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>标题</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>类型</Label>
            <Select
              value={String(form.notice_type ?? 1)}
              onValueChange={(v) =>
                setForm({ ...form, notice_type: Number(v) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">通知</SelectItem>
                <SelectItem value="2">公告</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>内容</Label>
            <Textarea
              rows={5}
              value={form.content ?? ''}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>发布</Label>
            <Switch
              checked={form.status === 1}
              onCheckedChange={(c) => setForm({ ...form, status: c ? 1 : 0 })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button
            onClick={() => onSubmit(editing?.id, form)}
            disabled={saving || !form.title.trim()}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
