import { useState } from 'react'
import type { ReactNode } from 'react'
import { BadgeCheck, Hash, LoaderCircle, ShieldCheck, SlidersHorizontal } from 'lucide-react'
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
import type { CreatePostPayload } from '@/lib/api/post'
import type { Post } from '@/lib/api/types'

interface PostDialogProps {
  editing?: Post
  saving: boolean
  onCancel: () => void
  onSubmit: (id: string | undefined, payload: CreatePostPayload) => void
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
    if (saving || !form.code.trim() || !form.name.trim()) return
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
                    {editing ? '岗位更新' : '新增岗位'}
                  </span>
                </div>
                <DialogTitle className="mt-3 text-xl font-semibold tracking-tight text-primary-foreground sm:text-2xl">
                  {editing ? '编辑岗位档案' : '登记岗位档案'}
                </DialogTitle>
                <DialogDescription className="mt-2 text-primary-foreground/75">
                  维护岗位编码、名称、排序和启用状态。
                </DialogDescription>
              </div>
              <div className="relative flex shrink-0 items-center gap-3 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                    岗位状态
                  </p>
                  <Label htmlFor="post-status" className="mt-0.5 block cursor-pointer text-xs font-bold text-foreground">
                    {form.status === 1 ? '启用' : '停用'}
                  </Label>
                </div>
                <Switch
                  id="post-status"
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
                      <h3 className="text-sm font-semibold">岗位标识</h3>
                      <p className="text-xs text-muted-foreground">用于岗位识别和排序展示</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={Hash} label="岗位编码" htmlFor="post-code" required>
                      <Input
                        id="post-code"
                        value={form.code}
                        disabled={!!editing}
                        placeholder="如 ceo"
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                        className="h-10 bg-muted/25 px-3"
                      />
                    </Field>
                    <Field icon={BadgeCheck} label="岗位名称" htmlFor="post-name" required>
                      <Input
                        id="post-name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                      <h3 className="text-sm font-semibold">展示信息</h3>
                      <p className="text-xs text-muted-foreground">控制岗位展示顺序和备注说明</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={SlidersHorizontal} label="排序" htmlFor="post-sort">
                      <Input
                        id="post-sort"
                        type="number"
                        value={form.sort ?? 0}
                        onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })}
                        className="h-10 bg-muted/25 px-3"
                      />
                    </Field>
                    <Field icon={BadgeCheck} label="备注" htmlFor="post-remark">
                      <Input
                        id="post-remark"
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
              <Button type="submit" disabled={saving || !form.code.trim() || !form.name.trim()} className="min-w-24">
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
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
