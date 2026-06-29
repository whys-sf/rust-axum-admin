import { useForm } from '@tanstack/react-form'
import {
  BadgeCheck,
  FileText,
  LoaderCircle,
  Megaphone,
  ShieldCheck,
} from 'lucide-react'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { DialogHeroHeader } from '@/components/common/dialog-hero-header'
import { FormField as Field } from '@/components/common/form-field'
import { DialogStatusSwitch } from '@/components/common/dialog-status-switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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


export function NoticeDialog({
  editing,
  saving,
  onCancel,
  onSubmit,
}: NoticeDialogProps) {
  const form = useForm({
    defaultValues: {
      title: editing?.title ?? '',
      notice_type: editing?.notice_type ?? 1,
      content: editing?.content ?? '',
      status: editing?.status ?? 1,
    } satisfies CreateNoticePayload,
    onSubmit: ({ value }) => {
      if (saving || !value.title.trim()) return
      onSubmit(editing?.id, value)
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
            eyebrow={editing ? '公告更新' : '新增公告'}
            title={editing ? '编辑通知公告' : '编写通知公告'}
            description="维护通知公告的标题、类型、内容和发布状态。"
            aside={(
                <form.Field name="status">
                  {(field) => (
                    <DialogStatusSwitch
                      id="notice-status"
                      eyebrow="发布状态"
                      checked={field.state.value === 1}
                      checkedLabel="发布"
                      uncheckedLabel="草稿"
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
                      <h3 className="text-sm font-semibold">公告信息</h3>
                      <p className="text-xs text-muted-foreground">定义公告标题和内容类型</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <form.Field name="title">
                      {(field) => (
                        <Field icon={Megaphone} label="标题" htmlFor="notice-title" required>
                          <Input
                            id="notice-title"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="h-10 bg-muted/25 px-3"
                          />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="notice_type">
                      {(field) => (
                        <Field icon={BadgeCheck} label="类型" htmlFor="notice-type">
                          <Select
                            value={String(field.state.value ?? 1)}
                            onValueChange={(v) => field.handleChange(Number(v))}
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
                      <h3 className="text-sm font-semibold">正文内容</h3>
                      <p className="text-xs text-muted-foreground">填写面向用户展示的公告正文</p>
                    </div>
                  </div>
                  <form.Field name="content">
                    {(field) => (
                      <Field icon={FileText} label="内容" htmlFor="notice-content">
                        <Textarea
                          id="notice-content"
                          rows={5}
                          value={field.state.value ?? ''}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className="min-h-32 resize-none bg-muted/25 px-3"
                        />
                      </Field>
                    )}
                  </form.Field>
                </section>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mx-0 mb-0 mt-auto flex-row items-center justify-end rounded-none px-5 py-4 sm:px-7">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
                取消
              </Button>
              <form.Subscribe selector={(state) => state.values.title}>
                {(title) => (
                  <Button type="submit" disabled={saving || !title.trim()} className="min-w-24">
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
                )}
              </form.Subscribe>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
