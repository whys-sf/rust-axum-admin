import { useState } from "react";
import {
  AtSign,
  BadgeCheck,
  Building2,
  KeyRound,
  LoaderCircle,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateUserPayload, UpdateUserPayload } from "@/lib/api/user";
import type { FlatOption } from "@/lib/tree";
import type { User } from "@/lib/api/types";

interface UserDialogProps {
  editing?: User;
  deptOptions: FlatOption[];
  saving: boolean;
  onCancel: () => void;
  onCreate: (payload: CreateUserPayload) => void;
  onUpdate: (id: string, payload: UpdateUserPayload) => void;
}

interface FieldProps {
  icon: typeof UserRound;
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
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
  );
}

export function UserDialog({
  editing,
  deptOptions,
  saving,
  onCancel,
  onCreate,
  onUpdate,
}: UserDialogProps) {
  const [form, setForm] = useState({
    username: editing?.username ?? "",
    password: "",
    nickname: editing?.nickname ?? "",
    email: editing?.email ?? "",
    phone: editing?.phone ?? "",
    dept_id: editing?.dept_id ?? "0",
    status: editing?.status ?? 1,
    remark: editing?.remark ?? "",
  });

  function submit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!valid || saving) return;

    const dept_id = form.dept_id === "0" ? null : form.dept_id;
    if (editing) {
      onUpdate(editing.id, {
        nickname: form.nickname || null,
        email: form.email || null,
        phone: form.phone || null,
        dept_id,
        status: form.status,
        remark: form.remark || null,
      });
    } else {
      onCreate({
        username: form.username,
        password: form.password,
        nickname: form.nickname || null,
        email: form.email || null,
        phone: form.phone || null,
        dept_id,
        status: form.status,
        remark: form.remark || null,
      });
    }
  }

  const usernameValid = form.username.trim().length >= 3;
  const passwordValid = form.password.length >= 6;
  const valid = editing ? true : usernameValid && passwordValid;

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-2xl dark:ring-white/10"
      >
        <form
          onSubmit={submit}
          className="flex min-h-0 flex-col"
        >
          <div className="flex min-h-0 flex-col">
            <DialogHeader className="control-grid relative overflow-hidden bg-primary px-5 py-5 text-left text-primary-foreground sm:px-7 sm:py-6">
                <div className="absolute -top-14 -right-12 size-40 rounded-full border border-primary-foreground/10" />
                <div className="absolute -top-6 -right-2 size-24 rounded-full border border-primary-foreground/10" />
                <div className="relative flex items-start justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-3.5 text-primary-foreground/80" />
                      <span className="text-[10px] font-semibold tracking-[0.2em] text-primary-foreground/80 uppercase">
                        {editing ? "Record update" : "New credential"}
                      </span>
                    </div>
                    <DialogTitle className="mt-3 text-xl font-semibold tracking-tight text-primary-foreground sm:text-2xl">
                      {editing ? "编辑身份档案" : "登记组织成员"}
                    </DialogTitle>
                    <DialogDescription className="mt-2 text-primary-foreground/75">
                      {editing
                        ? "更新成员的组织信息与访问状态，用户名不可修改。"
                        : "创建登录凭证，并将成员加入正确的组织单元。"}
                    </DialogDescription>
                  </div>
                  <div className="relative flex shrink-0 items-center gap-3 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
                    <div>
                      <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                        账号状态
                      </p>
                      <Label
                        htmlFor="user-status"
                        className="mt-0.5 block cursor-pointer text-xs font-bold text-foreground"
                      >
                        {form.status === 1 ? "允许登录" : "暂停登录"}
                      </Label>
                    </div>
                    <Switch
                      id="user-status"
                      checked={form.status === 1}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, status: checked ? 1 : 0 })
                      }
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
                      <h3 className="text-sm font-semibold">账号凭证</h3>
                      <p className="text-xs text-muted-foreground">
                        用于识别和登录系统
                      </p>
                    </div>
                  </div>
                  <div
                    className={`grid gap-4 ${editing ? "" : "sm:grid-cols-2"}`}
                  >
                    <Field
                      icon={AtSign}
                      label="用户名"
                      htmlFor="user-username"
                      required
                    >
                      <Input
                        id="user-username"
                        required={!editing}
                        autoFocus={!editing}
                        autoComplete="username"
                        placeholder="至少 3 个字符"
                        value={form.username}
                        disabled={!!editing}
                        aria-invalid={
                          !editing && form.username.length > 0 && !usernameValid
                        }
                        onChange={(event) =>
                          setForm({ ...form, username: event.target.value })
                        }
                        className="h-10 bg-muted/25 px-3"
                      />
                      {!editing &&
                        form.username.length > 0 &&
                        !usernameValid && (
                          <p className="mt-1.5 text-xs text-destructive">
                            用户名至少需要 3 个字符
                          </p>
                        )}
                    </Field>
                    {!editing && (
                      <Field
                        icon={KeyRound}
                        label="初始密码"
                        htmlFor="user-password"
                        required
                      >
                        <Input
                          id="user-password"
                          required
                          type="password"
                          autoComplete="new-password"
                          placeholder="至少 6 个字符"
                          value={form.password}
                          aria-invalid={
                            form.password.length > 0 && !passwordValid
                          }
                          onChange={(event) =>
                            setForm({ ...form, password: event.target.value })
                          }
                          className="h-10 bg-muted/25 px-3"
                        />
                        {form.password.length > 0 && !passwordValid && (
                          <p className="mt-1.5 text-xs text-destructive">
                            密码至少需要 6 个字符
                          </p>
                        )}
                      </Field>
                    )}
                  </div>
                </section>

                <section className="space-y-4 border-t border-dashed pt-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
                      02
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">组织资料</h3>
                      <p className="text-xs text-muted-foreground">
                        成员名称与部门归属
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      icon={UserRound}
                      label="显示昵称"
                      htmlFor="user-nickname"
                    >
                      <Input
                        id="user-nickname"
                        placeholder="成员在系统中的称呼"
                        value={form.nickname ?? ""}
                        onChange={(event) =>
                          setForm({ ...form, nickname: event.target.value })
                        }
                        className="h-10 bg-muted/25 px-3"
                      />
                    </Field>
                    <Field
                      icon={Building2}
                      label="所属部门"
                      htmlFor="user-dept"
                    >
                      <Select
                        value={form.dept_id ?? "0"}
                        onValueChange={(value) =>
                          setForm({ ...form, dept_id: value })
                        }
                      >
                        <SelectTrigger
                          id="user-dept"
                          className="w-full bg-muted/25 px-3 data-[size=default]:h-10"
                        >
                          <SelectValue placeholder="未分配部门" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">未分配部门</SelectItem>
                          {deptOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {"\u00A0".repeat(option.depth * 2)}
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </section>

                <section className="space-y-4 border-t border-dashed pt-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
                      03
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">联系方式</h3>
                      <p className="text-xs text-muted-foreground">
                        补充成员联络信息与备注
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={Mail} label="邮箱地址" htmlFor="user-email">
                      <Input
                        id="user-email"
                        type="email"
                        autoComplete="email"
                        placeholder="name@company.com"
                        value={form.email ?? ""}
                        onChange={(event) =>
                          setForm({ ...form, email: event.target.value })
                        }
                        className="h-10 bg-muted/25 px-3"
                      />
                    </Field>
                    <Field icon={Phone} label="手机号码" htmlFor="user-phone">
                      <Input
                        id="user-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="请输入手机号码"
                        value={form.phone ?? ""}
                        onChange={(event) =>
                          setForm({ ...form, phone: event.target.value })
                        }
                        className="h-10 bg-muted/25 px-3"
                      />
                    </Field>
                  </div>
                  <Field
                    icon={BadgeCheck}
                    label="档案备注"
                    htmlFor="user-remark"
                  >
                    <Textarea
                      id="user-remark"
                      rows={2}
                      placeholder="记录职责范围、入职信息或其他说明…"
                      value={form.remark ?? ""}
                      onChange={(event) =>
                        setForm({ ...form, remark: event.target.value })
                      }
                      className="min-h-18 resize-none bg-muted/25 px-3"
                    />
                  </Field>
                </section>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mx-0 mb-0 mt-auto flex-row items-center justify-end rounded-none px-5 py-4 sm:px-7">
              <div className="flex items-center gap-2">
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
                  disabled={saving || !valid}
                  className="min-w-24"
                >
                  {saving ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      保存中
                    </>
                  ) : (
                    <>
                      <ShieldCheck />
                      {editing ? "更新档案" : "创建档案"}
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
