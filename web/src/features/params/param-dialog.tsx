import { useState } from 'react'
import type { ReactNode } from 'react'
import { BadgeCheck, Hash, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react'
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
import type { CreateParamPayload } from '@/lib/api/param'
import type { Param } from '@/lib/api/types'

interface ParamDialogProps {
  editing?: Param
  saving: boolean
  onCancel: () => void
  onSubmit: (id: string | undefined, payload: CreateParamPayload) => void
}

interface FieldProps {
  icon: typeof Hash
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
    if (saving || !form.name.trim() || !form.param_key.trim()) return
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
                    {editing ? '参数更新' : '新增参数'}
                  </span>
                </div>
                <DialogTitle className="mt-3 text-xl font-semibold tracking-tight text-primary-foreground sm:text-2xl">
                  {editing ? '编辑参数档案' : '登记系统参数'}
                </DialogTitle>
                <DialogDescription className="mt-2 text-primary-foreground/75">
                  维护系统运行参数的键名、键值和备注。
                </DialogDescription>
              </div>
              <div className="relative hidden shrink-0 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80 sm:block">
                <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                  参数键
                </p>
                <p className="mt-0.5 max-w-32 truncate font-mono text-xs font-bold text-foreground">
                  {form.param_key || '待配置'}
                </p>
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
                      <h3 className="text-sm font-semibold">参数标识</h3>
                      <p className="text-xs text-muted-foreground">定义参数名称和唯一键名</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={BadgeCheck} label="参数名称" htmlFor="param-name" required>
                      <Input
                        id="param-name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="h-10 bg-muted/25 px-3"
                      />
                    </Field>
                    <Field icon={Hash} label="键名" htmlFor="param-key" required>
                      <Input
                        id="param-key"
                        value={form.param_key}
                        disabled={!!editing}
                        placeholder="如 sys.account.captcha"
                        onChange={(e) => setForm({ ...form, param_key: e.target.value })}
                        className="h-10 bg-muted/25 px-3"
                      />
                    </Field>
                  </div>
                </section>

                <section className="space-y-4 border-t border-dashed pt-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      02
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">配置内容</h3>
                      <p className="text-xs text-muted-foreground">设置参数值和维护备注</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Field icon={KeyRound} label="键值" htmlFor="param-value">
                      <Input
                        id="param-value"
                        value={form.param_value}
                        onChange={(e) => setForm({ ...form, param_value: e.target.value })}
                        className="h-10 bg-muted/25 px-3"
                      />
                    </Field>
                    <Field icon={BadgeCheck} label="备注" htmlFor="param-remark">
                      <Input
                        id="param-remark"
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
              <Button type="submit" disabled={saving || !form.name.trim() || !form.param_key.trim()} className="min-w-24">
                {saving ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    保存中
                  </>
                ) : (
                  <>
                    <ShieldCheck />
                    {editing ? '更新参数' : '创建参数'}
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
