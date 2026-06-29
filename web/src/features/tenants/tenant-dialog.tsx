import { useState } from "react";
import {
  BadgeCheck,
  Building2,
  Globe2,
  KeyRound,
  LoaderCircle,
  PackageCheck,
  Phone,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DialogHeroHeader } from "@/components/common/dialog-hero-header";
import { FormField as Field } from "@/components/common/form-field";
import type {
  CreateTenantPayload,
  UpdateTenantPayload,
} from "@/lib/api/tenant";
import type { Package, Tenant } from "@/lib/api/types";

interface TenantDialogProps {
  editing?: Tenant;
  packages: Package[];
  saving: boolean;
  onCancel: () => void;
  onCreate: (payload: CreateTenantPayload) => void;
  onUpdate: (id: string, payload: UpdateTenantPayload) => void;
}

export function TenantDialog({
  editing,
  packages,
  saving,
  onCancel,
  onCreate,
  onUpdate,
}: TenantDialogProps) {
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    code: editing?.code ?? "",
    contact_name: editing?.contact_name ?? "",
    contact_phone: editing?.contact_phone ?? "",
    domain: editing?.domain ?? "",
    package_id: editing?.package_id ?? "none",
    user_limit: editing?.user_limit ?? 10,
    remark: editing?.remark ?? "",
    admin_username: "",
    admin_password: "",
  });

  const nameValid = form.name.trim().length >= 2;
  const codeValid = form.code.trim().length >= 2;
  const adminUserValid = form.admin_username.trim().length >= 3;
  const adminPasswordValid = form.admin_password.length >= 6;
  const userLimitValid = Number.isFinite(form.user_limit) && form.user_limit >= 0;
  const valid = editing
    ? nameValid && userLimitValid
    : nameValid &&
      codeValid &&
      adminUserValid &&
      adminPasswordValid &&
      userLimitValid;

  function submit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!valid || saving) return;

    if (editing) {
      onUpdate(editing.id, {
        name: form.name.trim(),
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
        domain: form.domain || null,
        package_id: form.package_id === "none" ? null : form.package_id,
        user_limit: form.user_limit,
        remark: form.remark || null,
      });
      return;
    }

    onCreate({
      name: form.name.trim(),
      code: form.code.trim(),
      contact_name: form.contact_name || null,
      contact_phone: form.contact_phone || null,
      domain: form.domain || null,
      package_id: form.package_id === "none" ? null : form.package_id,
      user_limit: form.user_limit,
      admin_username: form.admin_username.trim(),
      admin_password: form.admin_password,
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-2xl dark:ring-white/10"
      >
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-col">
            <DialogHeroHeader
              icon={Building2}
              eyebrow={editing ? "租户更新" : "新增租户"}
              title={editing ? "编辑租户档案" : "创建租户空间"}
              description={
                editing
                  ? "维护租户基础资料、配额和访问域名。"
                  : "初始化租户空间，并创建首个租户管理员账号。"
              }
              aside={
                <div className="relative hidden shrink-0 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80 sm:block">
                  <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                    租户编码
                  </p>
                  <p className="mt-0.5 max-w-32 truncate font-mono text-xs font-bold text-foreground">
                    {form.code || "待配置"}
                  </p>
                </div>
              }
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
                        <h3 className="text-sm font-semibold">租户标识</h3>
                        <p className="text-xs text-muted-foreground">
                          用于登录、授权和数据隔离
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        icon={Building2}
                        label="租户名称"
                        htmlFor="tenant-name"
                        required
                      >
                        <Input
                          id="tenant-name"
                          required
                          autoFocus
                          placeholder="例如：演示租户"
                          value={form.name}
                          aria-invalid={form.name.length > 0 && !nameValid}
                          onChange={(event) =>
                            setForm({ ...form, name: event.target.value })
                          }
                          className="h-10 bg-muted/25 px-3"
                        />
                        {form.name.length > 0 && !nameValid && (
                          <p className="mt-1.5 text-xs text-destructive">
                            租户名称至少需要 2 个字符
                          </p>
                        )}
                      </Field>
                      <Field
                        icon={ShieldCheck}
                        label="租户编码"
                        htmlFor="tenant-code"
                        required={!editing}
                      >
                        <Input
                          id="tenant-code"
                          required={!editing}
                          disabled={!!editing}
                          placeholder="例如：demo"
                          value={form.code}
                          aria-invalid={!editing && form.code.length > 0 && !codeValid}
                          onChange={(event) =>
                            setForm({ ...form, code: event.target.value })
                          }
                          className="h-10 bg-muted/25 px-3 font-mono"
                        />
                        {!editing && form.code.length > 0 && !codeValid && (
                          <p className="mt-1.5 text-xs text-destructive">
                            租户编码至少需要 2 个字符
                          </p>
                        )}
                      </Field>
                    </div>
                  </section>

                  {!editing && (
                    <section className="space-y-4 border-t border-dashed pt-6">
                      <div className="flex items-center gap-3">
                        <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          02
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold">管理员账号</h3>
                          <p className="text-xs text-muted-foreground">
                            首个账号会自动拥有租户管理权限
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          icon={UserRound}
                          label="管理员账号"
                          htmlFor="tenant-admin-username"
                          required
                        >
                          <Input
                            id="tenant-admin-username"
                            required
                            autoComplete="username"
                            placeholder="至少 3 个字符"
                            value={form.admin_username}
                            aria-invalid={
                              form.admin_username.length > 0 && !adminUserValid
                            }
                            onChange={(event) =>
                              setForm({
                                ...form,
                                admin_username: event.target.value,
                              })
                            }
                            className="h-10 bg-muted/25 px-3"
                          />
                          {form.admin_username.length > 0 && !adminUserValid && (
                            <p className="mt-1.5 text-xs text-destructive">
                              管理员账号至少需要 3 个字符
                            </p>
                          )}
                        </Field>
                        <Field
                          icon={KeyRound}
                          label="初始密码"
                          htmlFor="tenant-admin-password"
                          required
                        >
                          <Input
                            id="tenant-admin-password"
                            required
                            type="password"
                            autoComplete="new-password"
                            placeholder="至少 6 个字符"
                            value={form.admin_password}
                            aria-invalid={
                              form.admin_password.length > 0 &&
                              !adminPasswordValid
                            }
                            onChange={(event) =>
                              setForm({
                                ...form,
                                admin_password: event.target.value,
                              })
                            }
                            className="h-10 bg-muted/25 px-3"
                          />
                          {form.admin_password.length > 0 &&
                            !adminPasswordValid && (
                              <p className="mt-1.5 text-xs text-destructive">
                                密码至少需要 6 个字符
                              </p>
                            )}
                        </Field>
                      </div>
                    </section>
                  )}

                  <section className="space-y-4 border-t border-dashed pt-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {editing ? "02" : "03"}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">运营资料</h3>
                        <p className="text-xs text-muted-foreground">
                          联系人、访问域名和用户配额
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        icon={UserRound}
                        label="联系人"
                        htmlFor="tenant-contact-name"
                      >
                        <Input
                          id="tenant-contact-name"
                          placeholder="租户联系人"
                          value={form.contact_name ?? ""}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              contact_name: event.target.value,
                            })
                          }
                          className="h-10 bg-muted/25 px-3"
                        />
                      </Field>
                      <Field
                        icon={Phone}
                        label="联系电话"
                        htmlFor="tenant-contact-phone"
                      >
                        <Input
                          id="tenant-contact-phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="请输入联系电话"
                          value={form.contact_phone ?? ""}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              contact_phone: event.target.value,
                            })
                          }
                          className="h-10 bg-muted/25 px-3"
                        />
                      </Field>
                      <Field icon={Globe2} label="绑定域名" htmlFor="tenant-domain">
                        <Input
                          id="tenant-domain"
                          placeholder="例如：acme.example.com"
                          value={form.domain ?? ""}
                          onChange={(event) =>
                            setForm({ ...form, domain: event.target.value })
                          }
                          className="h-10 bg-muted/25 px-3"
                        />
                      </Field>
                      <Field
                        icon={PackageCheck}
                        label="绑定套餐"
                        htmlFor="tenant-package"
                      >
                        <Select
                          value={form.package_id}
                          onValueChange={(value) =>
                            setForm({ ...form, package_id: value })
                          }
                        >
                          <SelectTrigger
                            id="tenant-package"
                            className="h-10 bg-muted/25"
                          >
                            <SelectValue placeholder="选择套餐" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">不绑定套餐</SelectItem>
                            {packages.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field
                        icon={UsersRound}
                        label="用户上限"
                        htmlFor="tenant-user-limit"
                        required
                      >
                        <Input
                          id="tenant-user-limit"
                          required
                          type="number"
                          min={0}
                          value={form.user_limit}
                          aria-invalid={!userLimitValid}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              user_limit: Number(event.target.value),
                            })
                          }
                          className="h-10 bg-muted/25 px-3"
                        />
                        {!userLimitValid && (
                          <p className="mt-1.5 text-xs text-destructive">
                            用户上限不能小于 0
                          </p>
                        )}
                      </Field>
                    </div>
                    {editing && (
                      <Field
                        icon={BadgeCheck}
                        label="租户备注"
                        htmlFor="tenant-remark"
                      >
                        <Textarea
                          id="tenant-remark"
                          rows={2}
                          placeholder="记录商务信息、服务说明或其他备注..."
                          value={form.remark ?? ""}
                          onChange={(event) =>
                            setForm({ ...form, remark: event.target.value })
                          }
                          className="min-h-18 resize-none bg-muted/25 px-3"
                        />
                      </Field>
                    )}
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
                      <Building2 />
                      {editing ? "更新租户" : "创建租户"}
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
