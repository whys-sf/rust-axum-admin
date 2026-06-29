import { useForm } from '@tanstack/react-form'
import {
  BadgeCheck,
  Hash,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { DialogHeroHeader } from '@/components/common/dialog-hero-header'
import { FormField as Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  const form = useForm({
    defaultValues: {
      name: editing?.name ?? '',
      param_key: editing?.param_key ?? '',
      param_value: editing?.param_value ?? '',
      remark: editing?.remark ?? '',
    } satisfies CreateParamPayload,
    onSubmit: ({ value }) => {
      if (saving || !value.name.trim() || !value.param_key.trim()) return
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
            eyebrow={editing ? '参数更新' : '新增参数'}
            title={editing ? '编辑参数档案' : '登记系统参数'}
            description="维护系统运行参数的键名、键值和备注。"
            aside={(
              <div className="relative hidden shrink-0 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80 sm:block">
                <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                  参数键
                </p>
                <form.Subscribe selector={(state) => state.values.param_key}>
                  {(paramKey) => (
                    <p className="mt-0.5 max-w-32 truncate font-mono text-xs font-bold text-foreground">
                      {paramKey || '待配置'}
                    </p>
                  )}
                </form.Subscribe>
              </div>
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
                      <h3 className="text-sm font-semibold">参数标识</h3>
                      <p className="text-xs text-muted-foreground">定义参数名称和唯一键名</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <form.Field name="name">
                      {(field) => (
                        <Field icon={BadgeCheck} label="参数名称" htmlFor="param-name" required>
                          <Input
                            id="param-name"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="h-10 bg-muted/25 px-3"
                          />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="param_key">
                      {(field) => (
                        <Field icon={Hash} label="键名" htmlFor="param-key" required>
                          <Input
                            id="param-key"
                            value={field.state.value}
                            disabled={!!editing}
                            placeholder="如 sys.account.captcha"
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="h-10 bg-muted/25 px-3"
                          />
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
                      <h3 className="text-sm font-semibold">配置内容</h3>
                      <p className="text-xs text-muted-foreground">设置参数值和维护备注</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <form.Field name="param_value">
                      {(field) => (
                        <Field icon={KeyRound} label="键值" htmlFor="param-value">
                          <Input
                            id="param-value"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="h-10 bg-muted/25 px-3"
                          />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="remark">
                      {(field) => (
                        <Field icon={BadgeCheck} label="备注" htmlFor="param-remark">
                          <Input
                            id="param-remark"
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
                  <Button type="submit" disabled={saving || !values.name.trim() || !values.param_key.trim()} className="min-w-24">
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
                )}
              </form.Subscribe>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
