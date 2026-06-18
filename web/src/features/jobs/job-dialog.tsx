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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CreateJobPayload } from '@/lib/api/job'
import type { Job } from '@/lib/api/types'

interface JobDialogProps {
  editing?: Job
  saving: boolean
  onCancel: () => void
  onSubmit: (id: string | undefined, payload: CreateJobPayload) => void
}

const HANDLERS = [
  { value: 'demo:heartbeat', label: '心跳示例 (demo:heartbeat)' },
  { value: 'demo:cleanup', label: '清理示例 (demo:cleanup)' },
]

export function JobDialog({
  editing,
  saving,
  onCancel,
  onSubmit,
}: JobDialogProps) {
  const [form, setForm] = useState<CreateJobPayload>({
    name: editing?.name ?? '',
    invoke_target: editing?.invoke_target ?? 'demo:heartbeat',
    cron_expr: editing?.cron_expr ?? '0 0/1 * * * *',
    status: editing?.status ?? 0,
    remark: editing?.remark ?? '',
  })

  function submit() {
    onSubmit(editing?.id, { ...form, remark: form.remark?.trim() || null })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? '编辑任务' : '新增任务'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>任务名称</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>调用目标</Label>
            <Select
              value={form.invoke_target}
              onValueChange={(v) => setForm({ ...form, invoke_target: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HANDLERS.map((h) => (
                  <SelectItem key={h.value} value={h.value}>
                    {h.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cron 表达式</Label>
            <Input
              value={form.cron_expr}
              placeholder="秒 分 时 日 月 周，如 0 0/1 * * * *"
              className="font-mono"
              onChange={(e) => setForm({ ...form, cron_expr: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              六段式（含秒），例：每分钟 `0 0/1 * * * *`，每天 8 点 `0 0 8 * * *`
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>备注</Label>
            <Input
              value={form.remark ?? ''}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>启用（立即开始调度）</Label>
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
            disabled={
              saving || !form.name.trim() || !form.cron_expr.trim()
            }
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
