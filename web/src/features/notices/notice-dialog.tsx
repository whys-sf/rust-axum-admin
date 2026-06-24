import { useState } from 'react'
import type { ReactNode } from 'react'
import { BadgeCheck, FileText, LoaderCircle, Megaphone, ShieldCheck } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CreateNoticePayload } from '@/lib/api/notice'
import type { Notice } from '@/lib/api/types'

interface NoticeDialogProps {
  editing?: Notice
  saving: boolean
  onCancel: () => void
  onSubmit: (id: string | undefined, payload: CreateNoticePayload) => void
}

interface FieldProps {
  icon: typeof Megaphone
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

export function NoticeDialog({
  editing,
  saving,
  onCancel,
  onSubmit,
}: NoticeDialogProps) {
  const [form, setForm] = useState<CreateNoticePayload>({
    title: editing?.title ?? '',
    notice_type: editing?.notice_type ?? 1,
    content: editing?.content ?? '',
    status: editing?.status ?? 1,
  })

  function submit() {
    if (saving || !form.title.trim()) return
    onSubmit(editing?.id, form)
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
                    {editing ? '公告更新' : '新增公告'}
                  </span>
                </div>
                <DialogTitle className="mt-3 text-xl font-semibold tracking-tight text-primary-foreground sm:text-2xl">
                  {editing ? '编辑通知公告' : '编写通知公告'}
                </DialogTitle>
                <DialogDescription className="mt-2 text-primary-foreground/75">
                  维护通知公告的标题、类型、内容和发布状态。
                </DialogDescription>
              </div>
              <div className="relative flex shrink-0 items-center gap-3 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                    发布状态
                  </p>
                  <Label htmlFor="notice-status" className="mt-0.5 block cursor-pointer text-xs font-bold text-foreground">
                    {form.status === 1 ? '发布' : '草稿'}
                  </Label>
                </div>
                <Switch
                  id="notice-status"
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
                      <h3 className="text-sm font-semibold">公告信息</h3>
                      <p className="text-xs text-muted-foreground">定义公告标题和内容类型</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={Megaphone} label="标题" htmlFor="notice-title" required>
                      <Input
                        id="notice-title"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="h-10 bg-muted/25 px-3"
                      />
                    </Field>
                    <Field icon={BadgeCheck} label="类型" htmlFor="notice-type">
                      <Select
                        value={String(form.notice_type ?? 1)}
                        onValueChange={(v) => setForm({ ...form, notice_type: Number(v) })}
                      >
                        <SelectTrigger id="notice-type" className="w-full bg-muted/25 px-3 data-[size=default]:h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">通知</SelectItem>
                          <SelectItem value="2">公告</SelectItem>
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
                      <h3 className="text-sm font-semibold">正文内容</h3>
                      <p className="text-xs text-muted-foreground">填写面向用户展示的公告正文</p>
                    </div>
                  </div>
                  <Field icon={FileText} label="内容" htmlFor="notice-content">
                    <Textarea
                      id="notice-content"
                      rows={5}
                      value={form.content ?? ''}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      className="min-h-32 resize-none bg-muted/25 px-3"
                    />
                  </Field>
                </section>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mx-0 mb-0 mt-auto flex-row items-center justify-end rounded-none px-5 py-4 sm:px-7">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
                取消
              </Button>
              <Button type="submit" disabled={saving || !form.title.trim()} className="min-w-24">
                {saving ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    保存中
                  </>
                ) : (
                  <>
                    <ShieldCheck />
                    {editing ? '更新公告' : '创建公告'}
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
