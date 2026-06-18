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
import type { CreateParamPayload } from '@/lib/api/param'
import type { Param } from '@/lib/api/types'

interface ParamDialogProps {
  editing?: Param
  saving: boolean
  onCancel: () => void
  onSubmit: (id: string | undefined, payload: CreateParamPayload) => void
}

export function ParamDialog({
  editing,
  saving,
  onCancel,
  onSubmit,
}: ParamDialogProps) {
  const [form, setForm] = useState<CreateParamPayload>({
    name: editing?.name ?? '',
    param_key: editing?.param_key ?? '',
    param_value: editing?.param_value ?? '',
    remark: editing?.remark ?? '',
  })

  function submit() {
    onSubmit(editing?.id, { ...form, remark: form.remark?.trim() || null })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? '编辑参数' : '新增参数'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>参数名称</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>键名</Label>
            <Input
              value={form.param_key}
              disabled={!!editing}
              placeholder="如 sys.account.captcha"
              onChange={(e) => setForm({ ...form, param_key: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>键值</Label>
            <Input
              value={form.param_value}
              onChange={(e) =>
                setForm({ ...form, param_value: e.target.value })
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button
            onClick={submit}
            disabled={saving || !form.name.trim() || !form.param_key.trim()}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
