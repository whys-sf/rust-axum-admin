import { useForm } from "@tanstack/react-form";
import {
  ArrowUpDown,
  Database,
  FileText,
  Hash,
  LoaderCircle,
  ShieldCheck,
  Tag,
  Users,
} from 'lucide-react'
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogHeroHeader } from "@/components/common/dialog-hero-header";
import { FormField as Field } from '@/components/common/form-field'
import { DialogStatusSwitch } from '@/components/common/dialog-status-switch'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DATA_SCOPE_OPTIONS } from "@/lib/constants";
import type {
  CreateRolePayload,
  UpdateRolePayload,
} from "@/lib/api/role";
import type { Role } from "@/lib/api/types";

interface RoleDialogProps {
  editing?: Role;
  saving: boolean;
  onCancel: () => void;
  onCreate: (payload: CreateRolePayload) => void;
  onUpdate: (id: string, payload: UpdateRolePayload) => void;
}


export function RoleDialog({
  editing,
  saving,
  onCancel,
  onCreate,
  onUpdate,
}: RoleDialogProps) {
  const form = useForm({
    defaultValues: {
      name: editing?.name ?? "",
      code: editing?.code ?? "",
      sort: editing?.sort ?? 0,
      status: editing?.status ?? 1,
      data_scope: editing?.data_scope ?? 1,
      remark: editing?.remark ?? "",
    },
    onSubmit: ({ value }) => {
      const valid = editing
        ? value.name.trim().length > 0
        : value.name.trim().length > 0 && value.code.trim().length > 0;
      if (saving || !valid) return;
      if (editing) {
        onUpdate(editing.id, {
          name: value.name,
          sort: value.sort,
          status: value.status,
          data_scope: value.data_scope,
          remark: value.remark || null,
        });
      } else {
        onCreate({
          name: value.name,
          code: value.code,
          sort: value.sort,
          status: value.status,
          data_scope: value.data_scope,
          remark: value.remark || null,
        });
      }
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-2xl dark:ring-white/10"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
          className="flex min-h-0 flex-col"
        >
          <div className="flex min-h-0 flex-col">
            <DialogHeroHeader
              icon={ShieldCheck}
              eyebrow={editing ? "记录更新" : "新增记录"}
              title={editing ? "编辑角色" : "注册角色"}
              description={
                editing
                  ? "更新角色名称、数据范围与启用状态。"
                  : "创建新角色并配置数据权限范围。"
              }
              aside={(
                <form.Field name="status">
                  {(field) => (
                    <DialogStatusSwitch
                      id="role-status"
                      eyebrow="启用状态"
                      checked={field.state.value === 1}
                      checkedLabel="已启用"
                      uncheckedLabel="已禁用"
                      onCheckedChange={(checked) => field.handleChange(checked ? 1 : 0)}
                    />
                  )}
                </form.Field>
                )}
            />

            <ScrollArea className="max-h-[60vh]">
              <div className="px-5 pt-7 sm:px-7">
                <div className="space-y-7 pb-7">
                  {/* 01 基本信息 */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        01
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">基本信息</h3>
                        <p className="text-xs text-muted-foreground">
                          角色名称与唯一编码
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <form.Field name="name">
                        {(field) => (
                          <Field
                            icon={Tag}
                            label="角色名称"
                            htmlFor="role-name"
                            required
                          >
                            <Input
                              id="role-name"
                              required
                              autoFocus
                              value={field.state.value}
                              placeholder="输入角色显示名称"
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(e.target.value)}
                              className="h-10 bg-muted/25 px-3"
                            />
                          </Field>
                        )}
                      </form.Field>
                      <form.Field name="code">
                        {(field) => (
                          <Field
                            icon={Hash}
                            label="角色编码"
                            htmlFor="role-code"
                            required={!editing}
                          >
                            <Input
                              id="role-code"
                              required={!editing}
                              value={field.state.value}
                              disabled={!!editing}
                              placeholder="如 admin"
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(e.target.value)}
                              className="h-10 bg-muted/25 px-3 font-mono text-sm"
                            />
                          </Field>
                        )}
                      </form.Field>
                    </div>
                  </section>

                  {/* 02 权限配置 */}
                  <section className="space-y-4 border-t border-dashed pt-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        02
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">权限配置</h3>
                        <p className="text-xs text-muted-foreground">
                          数据范围与排序权重
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <form.Field name="data_scope">
                        {(field) => (
                          <Field
                            icon={Database}
                            label="数据范围"
                            htmlFor="role-data-scope"
                          >
                            <Select
                              value={String(field.state.value)}
                              onValueChange={(v) => field.handleChange(Number(v))}
                            >
                              <SelectTrigger
                                id="role-data-scope"
                                className="w-full bg-muted/25 px-3 data-[size=default]:h-10"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DATA_SCOPE_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={String(o.value)}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        )}
                      </form.Field>
                      <form.Field name="sort">
                        {(field) => (
                          <Field
                            icon={ArrowUpDown}
                            label="排序权重"
                            htmlFor="role-sort"
                          >
                            <Input
                              id="role-sort"
                              type="number"
                              value={field.state.value ?? 0}
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(Number(e.target.value))}
                              className="h-10 bg-muted/25 px-3 font-mono tabular-nums"
                            />
                          </Field>
                        )}
                      </form.Field>
                    </div>
                  </section>

                  {/* 03 其他设置 */}
                  <section className="space-y-4 border-t border-dashed pt-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        03
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">其他设置</h3>
                        <p className="text-xs text-muted-foreground">
                          备注与补充说明
                        </p>
                      </div>
                    </div>
                    <form.Field name="remark">
                      {(field) => (
                        <Field
                          icon={FileText}
                          label="备注"
                          htmlFor="role-remark"
                        >
                          <Input
                            id="role-remark"
                            value={field.state.value ?? ""}
                            placeholder="可选备注信息"
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="h-10 bg-muted/25 px-3"
                          />
                        </Field>
                      )}
                    </form.Field>
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
                  const valid = editing
                    ? values.name.trim().length > 0
                    : values.name.trim().length > 0 && values.code.trim().length > 0;
                  return (
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
                          <Users />
                          {editing ? "更新角色" : "创建角色"}
                        </>
                      )}
                    </Button>
                  );
                }}
              </form.Subscribe>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
