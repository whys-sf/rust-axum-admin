import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { CreateDictTypePayload } from '@/lib/api/dict'
import type { DictType } from '@/lib/api/types'

interface DictTypeDialogProps {
  editing?: DictType
  saving: boolean
  onCancel: () => void
  onSubmit: (id: string | undefined, payload: CreateDictTypePayload) => void
}

export function DictTypeDialog({
  editing,
  saving,
  onCancel,
  onSubmit,
}: DictTypeDialogProps) {
  const [form, setForm] = useState<CreateDictTypePayload>({
    code: editing?.code ?? '',
    name: editing?.name ?? '',
    is_tree: editing?.is_tree ?? false,
    status: editing?.status ?? 1,
    remark: editing?.remark ?? '',
  })

  function submit() {
    const payload: CreateDictTypePayload = {
      ...form,
      remark: form.remark?.trim() || null,
    }
    onSubmit(editing?.id, payload)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? '编辑字典类型' : '新增字典类型'}</DialogTitle>
          <DialogDescription>
            字典编码唯一，保存后不可修改；树形字典的字典项支持父子层级。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>字典编码</Label>
            <Input
              value={form.code}
              disabled={!!editing}
              placeholder="如 sys_user_status"
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>字典名称</Label>
            <Input
              value={form.name}
              placeholder="如 用户状态"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>树形结构</Label>
              <p className="text-xs text-muted-foreground">
                开启后字典项可设置上级，形成树。
              </p>
            </div>
            <Switch
              checked={form.is_tree}
              disabled={!!editing}
              onCheckedChange={(c) => setForm({ ...form, is_tree: c })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>备注</Label>
            <Textarea
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
