import { useState, type SubmitEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Bell,
  FileText,
  LoaderCircle,
  MailPlus,
  Radio,
  Type,
  Users,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

interface FieldProps {
  icon: typeof Type
  label: string
  htmlFor: string
  required?: boolean
  children: React.ReactNode
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

const MSG_TYPES: Record<number, { label: string; desc: string }> = {
  1: { label: "系统通知", desc: "全局性公告，适合全员推送" },
  2: { label: "站内信", desc: "定向沟通，支持指定收件人" },
}

export function ComposeDialog({
  saving,
  onCancel,
  onSubmit,
}: ComposeDialogProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [msgType, setMsgType] = useState(2)
  const [broadcast, setBroadcast] = useState(true)
  const [selected, setSelected] = useState<string[]>([])

  const typeInfo = MSG_TYPES[msgType]

  const usersQuery = useQuery({
    queryKey: ["users", "compose"],
    queryFn: () => userApi.list({ page: 1, page_size: 100 }),
    enabled: !broadcast,
  })

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function submit(event?: SubmitEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (saving || !title.trim()) return
    if (!broadcast && selected.length === 0) return
    onSubmit({
      title: title.trim(),
      content: content.trim() || undefined,
      msg_type: msgType,
      receiver_ids: broadcast ? [] : selected,
    })
  }

  const canSubmit = !!title.trim() && (broadcast || selected.length > 0) && !saving

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-2xl dark:ring-white/10"
      >
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-col">
            <DialogHeader className="control-grid relative overflow-hidden bg-primary px-5 py-5 text-left text-primary-foreground sm:px-7 sm:py-6">
              <div className="absolute -top-14 -right-12 size-40 rounded-full border border-primary-foreground/10" />
              <div className="absolute -top-6 -right-2 size-24 rounded-full border border-primary-foreground/10" />
              <div className="relative flex items-start justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2">
                    <MailPlus className="size-3.5 text-primary-foreground/80" />
                    <span className="text-[10px] font-semibold tracking-[0.2em] text-primary-foreground/80 uppercase">
                      消息中心
                    </span>
                  </div>
                  <DialogTitle className="mt-3 text-xl font-semibold tracking-tight text-primary-foreground sm:text-2xl">
                    发送消息
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-primary-foreground/75">
                    撰写通知或站内信，推送给指定的用户群体。
                  </DialogDescription>
                </div>
                <div className="flex shrink-0 gap-2">
                  <div className="relative flex items-center gap-3 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
                    <div>
                      <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                        投递范围
                      </p>
                      <Label
                        htmlFor="msg-broadcast"
                        className="mt-0.5 block cursor-pointer text-xs font-bold text-foreground"
                      >
                        {broadcast ? "全部用户" : "指定用户"}
                      </Label>
                    </div>
                    <Switch
                      id="msg-broadcast"
                      checked={broadcast}
                      onCheckedChange={setBroadcast}
                      className="scale-110 data-checked:bg-primary data-unchecked:bg-muted-foreground/40 **:data-[slot=switch-thumb]:bg-primary-foreground"
                    />
                  </div>
                </div>
              </div>
            </DialogHeader>

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
                      <Field icon={Type} label="消息标题" htmlFor="msg-title" required>
                        <Input
                          id="msg-title"
                          required
                          autoFocus
                          value={title}
                          placeholder="输入消息标题"
                          onChange={(e) => setTitle(e.target.value)}
                          className="h-10 bg-muted/25 px-3"
                        />
                      </Field>
                      <Field icon={Bell} label="消息类型" htmlFor="msg-type">
                        <Select
                          value={String(msgType)}
                          onValueChange={(v) => setMsgType(Number(v))}
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
                    </div>
                    {typeInfo && (
                      <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary ring-1 ring-primary/10">
                        当前类型：
                        <span className="font-semibold">{typeInfo.label}</span> —{" "}
                        {typeInfo.desc}
                      </p>
                    )}
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
                      <Textarea
                        id="msg-content"
                        rows={5}
                        value={content}
                        placeholder="输入消息正文内容..."
                        onChange={(e) => setContent(e.target.value)}
                        className="bg-muted/25 px-3"
                      />
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
                          {broadcast ? "当前为全员广播" : "选择指定的收件用户"}
                        </p>
                      </div>
                    </div>
                    {!broadcast && (
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
                                  checked={selected.includes(u.id)}
                                  onCheckedChange={() => toggle(u.id)}
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
                    {broadcast && (
                      <div className="flex items-center gap-3 rounded-lg bg-primary/5 px-3 py-2.5 ring-1 ring-primary/10">
                        <Radio className="size-4 text-primary" />
                        <span className="text-xs text-primary">
                          消息将广播至全部用户
                        </span>
                      </div>
                    )}
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
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
