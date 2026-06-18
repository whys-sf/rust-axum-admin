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
import type { CreatePostPayload } from '@/lib/api/post'
import type { Post } from '@/lib/api/types'

interface PostDialogProps {
  editing?: Post
  saving: boolean
  onCancel: () => void
  onSubmit: (id: string | undefined, payload: CreatePostPayload) => void
}

export function PostDialog({
  editing,
  saving,
  onCancel,
  onSubmit,
}: PostDialogProps) {
  const [form, setForm] = useState<CreatePostPayload>({
    code: editing?.code ?? '',
    name: editing?.name ?? '',
    sort: editing?.sort ?? 0,
    status: editing?.status ?? 1,
    remark: editing?.remark ?? '',
  })

  function submit() {
    onSubmit(editing?.id, { ...form, remark: form.remark?.trim() || null })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? '编辑岗位' : '新增岗位'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>岗位编码</Label>
            <Input
              value={form.code}
              disabled={!!editing}
              placeholder="如 ceo"
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>岗位名称</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>排序</Label>
            <Input
              type="number"
              value={form.sort ?? 0}
              onChange={(e) =>
                setForm({ ...form, sort: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>备注</Label>
            <Input
              value={form.remark ?? ''}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>启用</Label>
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
            onClick={submit}
            disabled={saving || !form.code.trim() || !form.name.trim()}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
