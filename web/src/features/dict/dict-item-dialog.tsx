import { useState, type SubmitEvent } from "react";
import {
  ArrowUpDown,
  BookOpen,
  FolderOpen,
  FolderTree,
  Hash,
  LoaderCircle,
  Paintbrush,
  ShieldCheck,
  Tag,
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
import type { CreateDictItemPayload } from "@/lib/api/dict";
import type { DictItem } from "@/lib/api/types";

export interface ItemOption {
  id: string;
  label: string;
  depth: number;
}

const LIST_CLASSES = [
  { value: "default", label: "默认" },
  { value: "success", label: "成功（绿）" },
  { value: "warning", label: "警告（黄）" },
  { value: "danger", label: "危险（红）" },
  { value: "info", label: "信息（蓝）" },
] as const;

const NONE = "__none__";

interface DictItemDialogProps {
  dictCode: string;
  isTree: boolean;
  parentOptions: ItemOption[];
  editing?: DictItem;
  parentId?: string;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (id: string | undefined, payload: CreateDictItemPayload) => void;
}


export function DictItemDialog({
  dictCode,
  isTree,
  parentOptions,
  editing,
  parentId,
  saving,
  onCancel,
  onSubmit,
}: DictItemDialogProps) {
  const [form, setForm] = useState<CreateDictItemPayload>({
    dict_code: dictCode,
    parent_id: editing?.parent_id ?? parentId ?? "0",
    label: editing?.label ?? "",
    value: editing?.value ?? "",
    sort: editing?.sort ?? 0,
    status: editing?.status ?? 1,
    list_class: editing?.list_class ?? null,
    remark: editing?.remark ?? "",
  });

  const valid = form.label.trim().length > 0 && form.value.trim().length > 0;

  function submit(event?: SubmitEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (saving || !valid) return;
    onSubmit(editing?.id, {
      ...form,
      list_class:
        form.list_class && form.list_class !== "default"
          ? form.list_class
          : null,
      remark: form.remark?.trim() || null,
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
              title={editing ? "编辑字典项" : "注册字典项"}
              description={<>字典「{dictCode}」</>}
              aside={(
                <DialogStatusSwitch
                  id="ditem-status"
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
                  {/* 01 字典归属 */}
                  {isTree && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          01
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold">字典归属</h3>
                          <p className="text-xs text-muted-foreground">
                            选择上级字典项
                          </p>
                        </div>
                      </div>
                      <Field
                        icon={FolderTree}
                        label="上级字典项"
                        htmlFor="ditem-parent"
                      >
                        <Select
                          value={form.parent_id}
                          onValueChange={(v) =>
                            setForm({ ...form, parent_id: v })
                          }
                        >
                          <SelectTrigger
                            id="ditem-parent"
                            className="w-full bg-muted/25 px-3 data-[size=default]:h-10"
                          >
                            <SelectValue placeholder="顶级" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">
                              <span className="flex items-center gap-1.5">
                                <FolderOpen className="size-3.5 text-primary/70" />
                                顶级
                              </span>
                            </SelectItem>
                            {parentOptions
                              .filter((o) => o.id !== editing?.id)
                              .map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                  <span
                                    className="flex items-center gap-1.5"
                                    style={{ paddingLeft: o.depth * 16 }}
                                  >
                                    <FolderTree className="size-3.5 shrink-0 text-amber-500/80" />
                                    {o.label}
                                  </span>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </section>
                  )}

                  {/* 02 基本信息 */}
                  <section
                    className={`space-y-4 ${isTree ? "border-t border-dashed pt-6" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-6 place-items-center rounded-full text-[10px] font-bold ${isTree ? "bg-foreground text-background" : "bg-primary text-primary-foreground"}`}
                      >
                        {isTree ? "02" : "01"}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">基本信息</h3>
                        <p className="text-xs text-muted-foreground">
                          标签文本与存储键值
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        icon={Tag}
                        label="标签"
                        htmlFor="ditem-label"
                        required
                      >
                        <Input
                          id="ditem-label"
                          required
                          autoFocus
                          value={form.label}
                          placeholder="展示文本"
                          onChange={(e) =>
                            setForm({ ...form, label: e.target.value })
                          }
                          className="h-10 bg-muted/25 px-3"
                        />
                      </Field>
                      <Field
                        icon={Hash}
                        label="键值"
                        htmlFor="ditem-value"
                        required
                      >
                        <Input
                          id="ditem-value"
                          required
                          value={form.value}
                          placeholder="存储值"
                          onChange={(e) =>
                            setForm({ ...form, value: e.target.value })
                          }
                          className="h-10 bg-muted/25 px-3 font-mono text-sm"
                        />
                      </Field>
                    </div>
                  </section>

                  {/* 03 显示设置 */}
                  <section className="space-y-4 border-t border-dashed pt-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {isTree ? "03" : "02"}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">显示设置</h3>
                        <p className="text-xs text-muted-foreground">
                          标签样式与排序权重
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        icon={Paintbrush}
                        label="标签样式"
                        htmlFor="ditem-list-class"
                      >
                        <Select
                          value={form.list_class || NONE}
                          onValueChange={(v) =>
                            setForm({
                              ...form,
                              list_class: v === NONE ? null : v,
                            })
                          }
                        >
                          <SelectTrigger
                            id="ditem-list-class"
                            className="w-full bg-muted/25 px-3 data-[size=default]:h-10"
                          >
                            <SelectValue placeholder="默认" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>默认</SelectItem>
                            {LIST_CLASSES.filter((c) => c.value !== "default").map(
                              (c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field
                        icon={ArrowUpDown}
                        label="排序权重"
                        htmlFor="ditem-sort"
                      >
                        <Input
                          id="ditem-sort"
                          type="number"
                          value={form.sort ?? 0}
                          onChange={(e) =>
                            setForm({ ...form, sort: Number(e.target.value) })
                          }
                          className="h-10 bg-muted/25 px-3 font-mono tabular-nums"
                        />
                      </Field>
                    </div>
                  </section>

                  {/* 04 备注 */}
                  <section className="space-y-4 border-t border-dashed pt-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {isTree ? "04" : "03"}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">备注</h3>
                        <p className="text-xs text-muted-foreground">
                          补充说明
                        </p>
                      </div>
                    </div>
                    <Field
                      icon={BookOpen}
                      label="备注内容"
                      htmlFor="ditem-remark"
                    >
                      <Input
                        id="ditem-remark"
                        value={form.remark ?? ""}
                        placeholder="可选备注"
                        onChange={(e) =>
                          setForm({ ...form, remark: e.target.value })
                        }
                        className="h-10 bg-muted/25 px-3"
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
                    <BookOpen />
                    {editing ? "更新字典项" : "创建字典项"}
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
