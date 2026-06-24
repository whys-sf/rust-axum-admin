import { useState } from 'react'
import type { ReactNode } from 'react'
import { BadgeCheck, Clock3, LoaderCircle, Play, ShieldCheck, Terminal } from 'lucide-react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
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

interface FieldProps {
  icon: typeof Play
  label: string
  htmlFor: string
  required?: boolean
  children: ReactNode
}

function Field({ icon: Icon, label, htmlFor, required, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground/80"
      >
        <Icon className="size-3.5 text-primary" />
        <span>
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-destructive">
              *
            </span>
          )}
        </span>
      </Label>
      {children}
    </div>
  )
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
    if (saving || !form.name.trim() || !form.cron_expr.trim()) return
    onSubmit(editing?.id, { ...form, remark: form.remark?.trim() || null })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-lg dark:ring-white/10"
      >
        <form onSubmit={(event) => { event.preventDefault(); submit() }} className="flex min-h-0 flex-col">
          <DialogHeader className="control-grid relative overflow-hidden bg-primary px-5 py-5 text-left text-primary-foreground sm:px-7 sm:py-6">
            <div className="absolute -top-14 -right-12 size-40 rounded-full border border-primary-foreground/10" />
            <div className="absolute -top-6 -right-2 size-24 rounded-full border border-primary-foreground/10" />
            <div className="relative flex items-start justify-between gap-5">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-3.5 text-primary-foreground/80" />
                  <span className="text-[10px] font-semibold tracking-[0.2em] text-primary-foreground/80 uppercase">
                    {editing ? '任务更新' : '新增任务'}
                  </span>
                </div>
                <DialogTitle className="mt-3 text-xl font-semibold tracking-tight text-primary-foreground sm:text-2xl">
                  {editing ? '编辑调度任务' : '登记调度任务'}
                </DialogTitle>
                <DialogDescription className="mt-2 text-primary-foreground/75">
                  配置计划任务的调用目标、Cron 表达式和调度状态。
                </DialogDescription>
              </div>
              <div className="relative flex shrink-0 items-center gap-3 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                    调度状态
                  </p>
                  <Label htmlFor="job-status" className="mt-0.5 block cursor-pointer text-xs font-bold text-foreground">
                    {form.status === 1 ? '运行中' : '暂停'}
                  </Label>
                </div>
                <Switch
                  id="job-status"
                  checked={form.status === 1}
                  onCheckedChange={(c) => setForm({ ...form, status: c ? 1 : 0 })}
                  className="scale-110 data-checked:bg-primary data-unchecked:bg-muted-foreground/40 **:data-[slot=switch-thumb]:bg-primary-foreground"
                />
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="px-5 pt-7 sm:px-7">
              <div className="space-y-7 pb-7">
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      01
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">任务目标</h3>
                      <p className="text-xs text-muted-foreground">定义任务名称和执行处理器</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={Play} label="任务名称" htmlFor="job-name" required>
                      <Input
                        id="job-name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="h-10 bg-muted/25 px-3"
                      />
                    </Field>
                    <Field icon={Terminal} label="调用目标" htmlFor="job-target">
                      <Select
                        value={form.invoke_target}
                        onValueChange={(v) => setForm({ ...form, invoke_target: v })}
                      >
                        <SelectTrigger id="job-target" className="w-full bg-muted/25 px-3 data-[size=default]:h-10">
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
                    </Field>
                  </div>
                </section>

                <section className="space-y-4 border-t border-dashed pt-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      02
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">调度规则</h3>
                      <p className="text-xs text-muted-foreground">设置执行周期和备注说明</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Field icon={Clock3} label="Cron 表达式" htmlFor="job-cron" required>
                      <Input
                        id="job-cron"
                        value={form.cron_expr}
                        placeholder="秒 分 时 日 月 周，如 0 0/1 * * * *"
                        className="h-10 bg-muted/25 px-3 font-mono"
                        onChange={(e) => setForm({ ...form, cron_expr: e.target.value })}
                      />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        六段式（含秒），例：每分钟 0 0/1 * * * *，每天 8 点 0 0 8 * * *
                      </p>
                    </Field>
                    <Field icon={BadgeCheck} label="备注" htmlFor="job-remark">
                      <Input
                        id="job-remark"
                        value={form.remark ?? ''}
                        onChange={(e) => setForm({ ...form, remark: e.target.value })}
                        className="h-10 bg-muted/25 px-3"
                      />
                    </Field>
                  </div>
                </section>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mx-0 mb-0 mt-auto flex-row items-center justify-end rounded-none px-5 py-4 sm:px-7">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
                取消
              </Button>
              <Button type="submit" disabled={saving || !form.name.trim() || !form.cron_expr.trim()} className="min-w-24">
                {saving ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    保存中
                  </>
                ) : (
                  <>
                    <ShieldCheck />
                    {editing ? '更新任务' : '创建任务'}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
