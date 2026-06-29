import { useForm } from '@tanstack/react-form'
import {
  BadgeCheck,
  Hash,
  LoaderCircle,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { DialogHeroHeader } from '@/components/common/dialog-hero-header'
import { FormField as Field } from '@/components/common/form-field'
import { DialogStatusSwitch } from '@/components/common/dialog-status-switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  const form = useForm({
    defaultValues: {
      code: editing?.code ?? '',
      name: editing?.name ?? '',
      sort: editing?.sort ?? 0,
      status: editing?.status ?? 1,
      remark: editing?.remark ?? '',
    } satisfies CreatePostPayload,
    onSubmit: ({ value }) => {
      if (saving || !value.code.trim() || !value.name.trim()) return
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
            eyebrow={editing ? '岗位更新' : '新增岗位'}
            title={editing ? '编辑岗位档案' : '登记岗位档案'}
            description="维护岗位编码、名称、排序和启用状态。"
            aside={(
                <form.Field name="status">
                  {(field) => (
                    <DialogStatusSwitch
                      id="post-status"
                      eyebrow="岗位状态"
                      checked={field.state.value === 1}
                      checkedLabel="启用"
                      uncheckedLabel="停用"
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
                      <h3 className="text-sm font-semibold">岗位标识</h3>
                      <p className="text-xs text-muted-foreground">用于岗位识别和排序展示</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <form.Field name="code">
                      {(field) => (
                        <Field icon={Hash} label="岗位编码" htmlFor="post-code" required>
                          <Input
                            id="post-code"
                            value={field.state.value}
                            disabled={!!editing}
                            placeholder="如 ceo"
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="h-10 bg-muted/25 px-3"
                          />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="name">
                      {(field) => (
                        <Field icon={BadgeCheck} label="岗位名称" htmlFor="post-name" required>
                          <Input
                            id="post-name"
                            value={field.state.value}
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
                      <h3 className="text-sm font-semibold">展示信息</h3>
                      <p className="text-xs text-muted-foreground">控制岗位展示顺序和备注说明</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <form.Field name="sort">
                      {(field) => (
                        <Field icon={SlidersHorizontal} label="排序" htmlFor="post-sort">
                          <Input
                            id="post-sort"
                            type="number"
                            value={field.state.value ?? 0}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(Number(e.target.value))}
                            className="h-10 bg-muted/25 px-3"
                          />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="remark">
                      {(field) => (
                        <Field icon={BadgeCheck} label="备注" htmlFor="post-remark">
                          <Input
                            id="post-remark"
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
                  <Button type="submit" disabled={saving || !values.code.trim() || !values.name.trim()} className="min-w-24">
                    {saving ? (
                      <>
                        <LoaderCircle className="animate-spin" />
                        保存中
                      </>
                    ) : (
                      <>
                        <ShieldCheck />
                        {editing ? '更新岗位' : '创建岗位'}
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
