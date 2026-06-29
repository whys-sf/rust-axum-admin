import { useForm } from "@tanstack/react-form"
import { useQuery } from "@tanstack/react-query"
import {
  Bell,
  FileText,
  LoaderCircle,
  MailPlus,
  Radio,
  Type,
  Users,
} from 'lucide-react'
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { DialogHeroHeader } from "@/components/common/dialog-hero-header"
import { FormField as Field } from '@/components/common/form-field'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { userApi } from "@/lib/api/user"
import type { SendMessagePayload } from "@/lib/api/message"

interface ComposeDialogProps {
  saving: boolean
  onCancel: () => void
  onSubmit: (payload: SendMessagePayload) => void
}


const MSG_TYPES: Record<number, { label: string; desc: string }> = {
  1: { label: "系统通知", desc: "全局性公告，适合全员推送" },
  2: { label: "站内信", desc: "定向沟通，支持指定收件人" },
}

export function ComposeDialog({
  saving,
  onCancel,
  onSubmit,
}: ComposeDialogProps) {
  const form = useForm({
    defaultValues: {
      title: "",
      content: "",
      msg_type: 2,
      broadcast: true,
      receiver_ids: [] as string[],
    },
    onSubmit: ({ value }) => {
      if (saving || !value.title.trim()) return
      if (!value.broadcast && value.receiver_ids.length === 0) return
      onSubmit({
        title: value.title.trim(),
        content: value.content.trim() || undefined,
        msg_type: value.msg_type,
        receiver_ids: value.broadcast ? [] : value.receiver_ids,
      })
    },
  })

  const usersQuery = useQuery({
    queryKey: ["users", "compose"],
    queryFn: () => userApi.list({ page: 1, page_size: 100 }),
    enabled: !form.state.values.broadcast,
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-2xl dark:ring-white/10"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            form.handleSubmit()
          }}
          className="flex min-h-0 flex-col"
        >
          <div className="flex min-h-0 flex-col">
            <DialogHeroHeader
              icon={MailPlus}
              eyebrow="消息中心"
              title="发送消息"
              description="撰写通知或站内信，推送给指定的用户群体。"
              aside={(
                <div className="relative flex items-center gap-3 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
                  <div>
                    <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                      投递范围
                    </p>
                    <Label
                      htmlFor="msg-broadcast"
                      className="mt-0.5 block cursor-pointer text-xs font-bold text-foreground"
                    >
                      <form.Subscribe selector={(state) => state.values.broadcast}>
                        {(broadcast) => (broadcast ? "全部用户" : "指定用户")}
                      </form.Subscribe>
                    </Label>
                  </div>
                  <form.Field name="broadcast">
                    {(field) => (
                      <Switch
                        id="msg-broadcast"
                        checked={field.state.value}
                        onCheckedChange={field.handleChange}
                        className="scale-110 data-checked:bg-primary data-unchecked:bg-muted-foreground/40 **:data-[slot=switch-thumb]:bg-primary-foreground"
                      />
                    )}
                  </form.Field>
                </div>
              )}
            />

            <ScrollArea className="max-h-[60vh]">
              <div className="px-5 pt-7 sm:px-7">
                <div className="space-y-7 pb-7">
                  {/* 01 消息设置 */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        01
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">消息设置</h3>
                        <p className="text-xs text-muted-foreground">
                          标题与消息类型
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <form.Field name="title">
                        {(field) => (
                          <Field icon={Type} label="消息标题" htmlFor="msg-title" required>
                            <Input
                              id="msg-title"
                              required
                              autoFocus
                              value={field.state.value}
                              placeholder="输入消息标题"
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(e.target.value)}
                              className="h-10 bg-muted/25 px-3"
                            />
                          </Field>
                        )}
                      </form.Field>
                      <form.Field name="msg_type">
                        {(field) => (
                          <Field icon={Bell} label="消息类型" htmlFor="msg-type">
                            <Select
                              value={String(field.state.value)}
                              onValueChange={(v) => field.handleChange(Number(v))}
                            >
                              <SelectTrigger
                                id="msg-type"
                                className="w-full bg-muted/25 px-3 data-[size=default]:h-10"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">
                                  系统通知 — 全局性公告，适合全员推送
                                </SelectItem>
                                <SelectItem value="2">
                                  站内信 — 定向沟通，支持指定收件人
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                        )}
                      </form.Field>
                    </div>
                    <form.Subscribe selector={(state) => MSG_TYPES[state.values.msg_type]}>
                      {(typeInfo) =>
                        typeInfo ? (
                          <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary ring-1 ring-primary/10">
                            当前类型：
                            <span className="font-semibold">{typeInfo.label}</span> —{" "}
                            {typeInfo.desc}
                          </p>
                        ) : null
                      }
                    </form.Subscribe>
                  </section>

                  {/* 02 消息内容 */}
                  <section className="space-y-4 border-t border-dashed pt-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        02
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">消息内容</h3>
                        <p className="text-xs text-muted-foreground">
                          正文与详情
                        </p>
                      </div>
                    </div>
                    <Field icon={FileText} label="正文" htmlFor="msg-content">
                      <form.Field name="content">
                        {(field) => (
                          <Textarea
                            id="msg-content"
                            rows={5}
                            value={field.state.value}
                            placeholder="输入消息正文内容..."
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="bg-muted/25 px-3"
                          />
                        )}
                      </form.Field>
                    </Field>
                  </section>

                  {/* 03 收件人 */}
                  <section className="space-y-4 border-t border-dashed pt-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        03
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">收件人</h3>
                        <p className="text-xs text-muted-foreground">
                          <form.Subscribe selector={(state) => state.values.broadcast}>
                            {(broadcast) => (broadcast ? "当前为全员广播" : "选择指定的收件用户")}
                          </form.Subscribe>
                        </p>
                      </div>
                    </div>
                    <form.Subscribe selector={(state) => state.values.broadcast}>
                      {(broadcast) =>
                        !broadcast ? (
                          <form.Field name="receiver_ids">
                            {(field) => (
                              <div className="space-y-2">
                                <Label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground/80">
                                  <Users className="size-3.5 text-primary" />
                                  <span>选择收件人</span>
                                </Label>
                                <div className="max-h-48 space-y-2 overflow-auto rounded-lg bg-muted/25 p-3 ring-1 ring-foreground/10">
                                  {usersQuery.isLoading ? (
                                    <p className="text-sm text-muted-foreground">
                                      加载中...
                                    </p>
                                  ) : (
                                    (usersQuery.data?.list ?? []).map((u) => (
                                      <label
                                        key={u.id}
                                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
                                      >
                                        <Checkbox
                                          checked={field.state.value.includes(u.id)}
                                          onCheckedChange={() => {
                                            const next = field.state.value.includes(u.id)
                                              ? field.state.value.filter((id) => id !== u.id)
                                              : [...field.state.value, u.id]
                                            field.handleChange(next)
                                          }}
                                        />
                                        <span>
                                          {u.nickname || u.username}
                                          <span className="ml-1 text-muted-foreground">
                                            @{u.username}
                                          </span>
                                        </span>
                                      </label>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </form.Field>
                        ) : (
                          <div className="flex items-center gap-3 rounded-lg bg-primary/5 px-3 py-2.5 ring-1 ring-primary/10">
                            <Radio className="size-4 text-primary" />
                            <span className="text-xs text-primary">
                              消息将广播至全部用户
                            </span>
                          </div>
                        )
                      }
                    </form.Subscribe>
                  </section>
                </div>
              </div>
            </ScrollArea>

            <div className="flex flex-row items-center justify-end gap-2 border-t px-5 py-4 sm:px-7">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={saving}
              >
                取消
              </Button>
              <form.Subscribe selector={(state) => state.values}>
                {(values) => {
                  const canSubmit = !!values.title.trim() && (values.broadcast || values.receiver_ids.length > 0) && !saving
                  return (
                    <Button
                      type="submit"
                      disabled={!canSubmit}
                      className="min-w-24"
                    >
                      {saving ? (
                        <>
                          <LoaderCircle className="animate-spin" />
                          发送中
                        </>
                      ) : (
                        <>
                          <MailPlus />
                          发送消息
                        </>
                      )}
                    </Button>
                  )
                }}
              </form.Subscribe>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
