import { useForm } from '@tanstack/react-form'
import {
  BadgeCheck,
  Clock3,
  LoaderCircle,
  Play,
  ShieldCheck,
  Terminal,
} from 'lucide-react'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { DialogHeroHeader } from '@/components/common/dialog-hero-header'
import { FormField as Field } from '@/components/common/form-field'
import { DialogStatusSwitch } from '@/components/common/dialog-status-switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  const form = useForm({
    defaultValues: {
      name: editing?.name ?? '',
      invoke_target: editing?.invoke_target ?? 'demo:heartbeat',
      cron_expr: editing?.cron_expr ?? '0 0/1 * * * *',
      status: editing?.status ?? 0,
      remark: editing?.remark ?? '',
    } satisfies CreateJobPayload,
    onSubmit: ({ value }) => {
      if (saving || !value.name.trim() || !value.cron_expr.trim()) return
      onSubmit(editing?.id, { ...value, remark: value.remark?.trim() || null })
    },
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-lg dark:ring-white/10"
      >
        <form onSubmit={(event) => { event.preventDefault(); form.handleSubmit() }} className="flex min-h-0 flex-col">
          <DialogHeroHeader
            icon={ShieldCheck}
            eyebrow={editing ? '任务更新' : '新增任务'}
            title={editing ? '编辑调度任务' : '登记调度任务'}
            description="配置计划任务的调用目标、Cron 表达式和调度状态。"
            aside={(
                <form.Field name="status">
                  {(field) => (
                    <DialogStatusSwitch
                      id="job-status"
                      eyebrow="调度状态"
                      checked={field.state.value === 1}
                      checkedLabel="运行中"
                      uncheckedLabel="暂停"
                      onCheckedChange={(checked) => field.handleChange(checked ? 1 : 0)}
                    />
                  )}
                </form.Field>
              )}
          />

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
                    <form.Field name="name">
                      {(field) => (
                        <Field icon={Play} label="任务名称" htmlFor="job-name" required>
                          <Input
                            id="job-name"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="h-10 bg-muted/25 px-3"
                          />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="invoke_target">
                      {(field) => (
                        <Field icon={Terminal} label="调用目标" htmlFor="job-target">
                          <Select
                            value={field.state.value}
                            onValueChange={field.handleChange}
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
                      )}
                    </form.Field>
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
                    <form.Field name="cron_expr">
                      {(field) => (
                        <Field icon={Clock3} label="Cron 表达式" htmlFor="job-cron" required>
                          <Input
                            id="job-cron"
                            value={field.state.value}
                            placeholder="秒 分 时 日 月 周，如 0 0/1 * * * *"
                            className="h-10 bg-muted/25 px-3 font-mono"
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            六段式（含秒），例：每分钟 0 0/1 * * * *，每天 8 点 0 0 8 * * *
                          </p>
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="remark">
                      {(field) => (
                        <Field icon={BadgeCheck} label="备注" htmlFor="job-remark">
                          <Input
                            id="job-remark"
                            value={field.state.value ?? ''}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="h-10 bg-muted/25 px-3"
                          />
                        </Field>
                      )}
                    </form.Field>
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
              <form.Subscribe selector={(state) => state.values}>
                {(values) => (
                  <Button type="submit" disabled={saving || !values.name.trim() || !values.cron_expr.trim()} className="min-w-24">
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
                )}
              </form.Subscribe>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
