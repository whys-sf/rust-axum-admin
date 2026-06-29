import { useState, type SubmitEvent } from "react";
import {
  ArrowUpDown,
  Building2,
  FolderOpen,
  FolderTree,
  LoaderCircle,
  Mail,
  Phone,
  ShieldCheck,
  Tag,
  UserCircle,
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
import type { CreateDeptPayload } from "@/lib/api/dept";
import type { FlatOption } from "@/lib/tree";
import type { DeptNode } from "@/lib/api/types";

interface DeptDialogProps {
  editing?: DeptNode;
  parentId?: string;
  options: FlatOption[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (id: string | undefined, payload: CreateDeptPayload) => void;
}


export function DeptDialog({
  editing,
  parentId,
  options,
  saving,
  onCancel,
  onSubmit,
}: DeptDialogProps) {
  const [form, setForm] = useState<CreateDeptPayload>({
    parent_id: editing?.parent_id ?? parentId ?? "0",
    name: editing?.name ?? "",
    leader: editing?.leader ?? "",
    phone: editing?.phone ?? "",
    email: editing?.email ?? "",
    sort: editing?.sort ?? 0,
    status: editing?.status ?? 1,
  });

  function submit(event?: SubmitEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (saving || !form.name.trim()) return;
    onSubmit(editing?.id, {
      ...form,
      leader: form.leader?.trim() || null,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
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
              icon={ShieldCheck}
              eyebrow={editing ? "记录更新" : "新增记录"}
              title={editing ? "编辑部门" : "注册部门"}
              description={
                editing
                  ? "更新部门层级归属、负责人与联系方式。"
                  : "创建新部门并挂载到正确的组织层级。"
              }
              aside={(
                <DialogStatusSwitch
                  id="dept-status"
                  eyebrow="启用状态"
                  checked={form.status === 1}
                  checkedLabel="已启用"
                  uncheckedLabel="已禁用"
                  onCheckedChange={(checked) => setForm({ ...form, status: checked ? 1 : 0 })}
                />
                )}
            />

            <ScrollArea className="max-h-[60vh]">
              <div className="px-5 pt-7 sm:px-7">
                <div className="space-y-7 pb-7">
                  {/* 01 部门归属 */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        01
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">部门归属</h3>
                        <p className="text-xs text-muted-foreground">
                          选择上级部门与组织挂载位置
                        </p>
                      </div>
                    </div>
                    <Field
                      icon={FolderTree}
                      label="上级部门"
                      htmlFor="dept-parent"
                    >
                      <Select
                        value={form.parent_id}
                        onValueChange={(v) =>
                          setForm({ ...form, parent_id: v })
                        }
                      >
                        <SelectTrigger
                          id="dept-parent"
                          className="w-full bg-muted/25 px-3 data-[size=default]:h-10"
                        >
                          <SelectValue placeholder="顶级部门" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">
                            <span className="flex items-center gap-1.5">
                              <FolderOpen className="size-3.5 text-primary/70" />
                              顶级部门
                            </span>
                          </SelectItem>
                          {options
                            .filter((o) => o.id !== editing?.id)
                            .map((o) => {
                              const isDir = o.type === 1;
                              return (
                                <SelectItem key={o.id} value={o.id}>
                                  <span
                                    className="flex items-center gap-1.5"
                                    style={{ paddingLeft: o.depth * 16 }}
                                  >
                                    {isDir ? (
                                      <FolderTree className="size-3.5 shrink-0 text-amber-500/80" />
                                    ) : (
                                      <Building2 className="size-3.5 shrink-0 text-primary/70" />
                                    )}
                                    {o.name}
                                  </span>
                                </SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                    </Field>
                  </section>

                  {/* 02 基本信息 */}
                  <section className="space-y-4 border-t border-dashed pt-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        02
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">基本信息</h3>
                        <p className="text-xs text-muted-foreground">
                          部门名称与负责人
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        icon={Tag}
                        label="部门名称"
                        htmlFor="dept-name"
                        required
                      >
                        <Input
                          id="dept-name"
                          required
                          autoFocus
                          value={form.name}
                          placeholder="输入部门显示名称"
                          onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                          }
                          className="h-10 bg-muted/25 px-3"
                        />
                      </Field>
                      <Field
                        icon={UserCircle}
                        label="负责人"
                        htmlFor="dept-leader"
                      >
                        <Input
                          id="dept-leader"
                          value={form.leader ?? ""}
                          placeholder="负责人姓名"
                          onChange={(e) =>
                            setForm({ ...form, leader: e.target.value })
                          }
                          className="h-10 bg-muted/25 px-3"
                        />
                      </Field>
                    </div>
                  </section>

                  {/* 03 联系方式 */}
                  <section className="space-y-4 border-t border-dashed pt-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        03
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">联系方式</h3>
                        <p className="text-xs text-muted-foreground">
                          电话与邮箱
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        icon={Phone}
                        label="联系电话"
                        htmlFor="dept-phone"
                      >
                        <Input
                          id="dept-phone"
                          value={form.phone ?? ""}
                          placeholder="联系电话"
                          onChange={(e) =>
                            setForm({ ...form, phone: e.target.value })
                          }
                          className="h-10 bg-muted/25 px-3"
                        />
                      </Field>
                      <Field
                        icon={Mail}
                        label="邮箱"
                        htmlFor="dept-email"
                      >
                        <Input
                          id="dept-email"
                          type="email"
                          value={form.email ?? ""}
                          placeholder="email@example.com"
                          onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                          }
                          className="h-10 bg-muted/25 px-3"
                        />
                      </Field>
                    </div>
                  </section>

                  {/* 04 显示设置 */}
                  <section className="space-y-4 border-t border-dashed pt-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        04
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">显示设置</h3>
                        <p className="text-xs text-muted-foreground">
                          排序权重
                        </p>
                      </div>
                    </div>
                    <Field
                      icon={ArrowUpDown}
                      label="排序权重"
                      htmlFor="dept-sort"
                    >
                      <Input
                        id="dept-sort"
                        type="number"
                        value={form.sort ?? 0}
                        onChange={(e) =>
                          setForm({ ...form, sort: Number(e.target.value) })
                        }
                        className="h-10 bg-muted/25 px-3 font-mono tabular-nums"
                      />
                    </Field>
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
                disabled={saving || !form.name.trim()}
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
                    {editing ? "更新部门" : "创建部门"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
