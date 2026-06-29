import { useState, type SubmitEvent } from "react";
import {
  BookOpen,
  Hash,
  LoaderCircle,
  ShieldCheck,
  Tag,
  Trees,
} from 'lucide-react'
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogHeroHeader } from "@/components/common/dialog-hero-header";
import { FormField as Field } from '@/components/common/form-field'
import { DialogStatusSwitch } from '@/components/common/dialog-status-switch'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CreateDictTypePayload } from "@/lib/api/dict";
import type { DictType } from "@/lib/api/types";

interface DictTypeDialogProps {
  editing?: DictType;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (id: string | undefined, payload: CreateDictTypePayload) => void;
}


export function DictTypeDialog({
  editing,
  saving,
  onCancel,
  onSubmit,
}: DictTypeDialogProps) {
  const [form, setForm] = useState<CreateDictTypePayload>({
    code: editing?.code ?? "",
    name: editing?.name ?? "",
    is_tree: editing?.is_tree ?? false,
    status: editing?.status ?? 1,
    remark: editing?.remark ?? "",
  });

  const valid = form.code.trim().length > 0 && form.name.trim().length > 0;

  function submit(event?: SubmitEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (saving || !valid) return;
    onSubmit(editing?.id, {
      ...form,
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
              title={editing ? "编辑字典类型" : "注册字典类型"}
              description={
                editing
                  ? "更新字典名称、结构与启用状态。"
                  : "字典编码唯一，保存后不可修改。"
              }
              aside={(
                <DialogStatusSwitch
                  id="dtype-status"
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
                  {/* 01 基本信息 */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        01
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">基本信息</h3>
                        <p className="text-xs text-muted-foreground">
                          字典编码与显示名称
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        icon={Hash}
                        label="字典编码"
                        htmlFor="dtype-code"
                        required
                      >
                        <Input
                          id="dtype-code"
                          required
                          autoFocus
                          value={form.code}
                          disabled={!!editing}
                          placeholder="如 sys_user_status"
                          onChange={(e) =>
                            setForm({ ...form, code: e.target.value })
                          }
                          className="h-10 bg-muted/25 px-3 font-mono text-sm"
                        />
                      </Field>
                      <Field
                        icon={Tag}
                        label="字典名称"
                        htmlFor="dtype-name"
                        required
                      >
                        <Input
                          id="dtype-name"
                          required
                          value={form.name}
                          placeholder="如 用户状态"
                          onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                          }
                          className="h-10 bg-muted/25 px-3"
                        />
                      </Field>
                    </div>
                  </section>

                  {/* 02 结构设置 */}
                  <section className="space-y-4 border-t border-dashed pt-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        02
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">结构设置</h3>
                        <p className="text-xs text-muted-foreground">
                          树形结构开关
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/25 px-4 py-3 ring-1 ring-foreground/8">
                      <div className="flex items-center gap-3">
                        <Trees className="size-4 text-primary" />
                        <div>
                          <Label
                            htmlFor="dtype-tree"
                            className="text-xs font-semibold"
                          >
                            树形结构
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            开启后字典项可设置上级，形成树
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="dtype-tree"
                        checked={form.is_tree}
                        disabled={!!editing}
                        onCheckedChange={(c) =>
                          setForm({ ...form, is_tree: c })
                        }
                      />
                    </div>
                  </section>

                  {/* 03 其他 */}
                  <section className="space-y-4 border-t border-dashed pt-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        03
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">其他</h3>
                        <p className="text-xs text-muted-foreground">
                          备注与补充说明
                        </p>
                      </div>
                    </div>
                    <Field
                      icon={BookOpen}
                      label="备注"
                      htmlFor="dtype-remark"
                    >
                      <Textarea
                        id="dtype-remark"
                        value={form.remark ?? ""}
                        onChange={(e) =>
                          setForm({ ...form, remark: e.target.value })
                        }
                        className="min-h-20 bg-muted/25 px-3 py-2"
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
                    {editing ? "更新类型" : "创建类型"}
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
