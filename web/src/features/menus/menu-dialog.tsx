import { useState, type SubmitEvent } from "react";
import {
  ArrowUpDown,
  Cable,
  Eye,
  FolderOpen,
  FolderTree,
  Globe,
  Layers,
  LayoutList,
  LoaderCircle,
  Lock,
  Paintbrush,
  Route,
  ShieldCheck,
  Tag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LucideIconPicker } from "@/components/common/lucide-icon-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateMenuPayload } from "@/lib/api/menu";
import type { FlatOption } from "@/lib/tree";
import type { MenuNode } from "@/lib/api/types";

interface MenuDialogProps {
  editing?: MenuNode;
  parentId?: string;
  options: FlatOption[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (id: string | undefined, payload: CreateMenuPayload) => void;
}

interface FieldProps {
  icon: typeof Tag;
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

const MENU_TYPES: Record<number, { label: string; desc: string }> = {
  1: { label: "目录", desc: "作为路由分组的容器" },
  2: { label: "菜单", desc: "绑定页面组件的路由项" },
  3: { label: "按钮", desc: "页面内的操作权限点" },
};

function cleanOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function MenuDialog({
  editing,
  parentId,
  options,
  saving,
  onCancel,
  onSubmit,
}: MenuDialogProps) {
  const [form, setForm] = useState<CreateMenuPayload>({
    parent_id: editing?.parent_id ?? parentId ?? "0",
    name: editing?.name ?? "",
    type: editing?.type ?? 2,
    path: editing?.path ?? "",
    component: null,
    perm: editing?.perm ?? "",
    api_path: editing?.api_path ?? "",
    api_method: editing?.api_method ?? "",
    icon: editing?.icon ?? "",
    sort: editing?.sort ?? 0,
    visible: editing?.visible ?? 1,
    status: editing?.status ?? 1,
  });

  const isButton = form.type === 3;
  const typeInfo = MENU_TYPES[form.type];

  function submit(event?: SubmitEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (saving || !form.name.trim()) return;
    const payload: CreateMenuPayload = {
      ...form,
      name: form.name.trim(),
      path: isButton ? null : cleanOptional(form.path),
      component: null,
      perm: cleanOptional(form.perm),
      api_path: cleanOptional(form.api_path),
      api_method: cleanOptional(form.api_method),
      icon: isButton ? null : cleanOptional(form.icon),
    };
    onSubmit(editing?.id, payload);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
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
                    <ShieldCheck className="size-3.5 text-primary-foreground/80" />
                    <span className="text-[10px] font-semibold tracking-[0.2em] text-primary-foreground/80 uppercase">
                      {editing ? "记录更新" : "新增记录"}
                    </span>
                  </div>
                  <DialogTitle className="mt-3 text-xl font-semibold tracking-tight text-primary-foreground sm:text-2xl">
                    {editing ? "编辑菜单项" : "注册菜单资源"}
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-primary-foreground/75">
                    {editing
                      ? "更新菜单的层级归属、路由配置与权限绑定。"
                      : "创建新的目录、菜单或按钮，并挂载到正确的层级。"}
                  </DialogDescription>
                </div>
                <div className="flex shrink-0 gap-2">
                  <div className="relative flex items-center gap-3 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
                    <div>
                      <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                        启用状态
                      </p>
                      <Label
                        htmlFor="menu-status"
                        className="mt-0.5 block cursor-pointer text-xs font-bold text-foreground"
                      >
                        {form.status === 1 ? "已启用" : "已禁用"}
                      </Label>
                    </div>
                    <Switch
                      id="menu-status"
                      checked={form.status === 1}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, status: checked ? 1 : 0 })
                      }
                      className="scale-110 data-checked:bg-primary data-unchecked:bg-muted-foreground/40 **:data-[slot=switch-thumb]:bg-primary-foreground"
                    />
                  </div>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh]">
              <div className="px-5 pt-7 sm:px-7">
                <div className="space-y-7 pb-7">
                  {/* 01 菜单归属 */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        01
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">菜单归属</h3>
                        <p className="text-xs text-muted-foreground">
                          选择挂载位置与资源类型
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        icon={FolderTree}
                        label="上级菜单"
                        htmlFor="menu-parent"
                      >
                        <Select
                          value={form.parent_id}
                          onValueChange={(v) =>
                            setForm({ ...form, parent_id: v })
                          }
                        >
                          <SelectTrigger
                            id="menu-parent"
                            className="w-full bg-muted/25 px-3 data-[size=default]:h-10"
                          >
                            <SelectValue placeholder="顶级" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">
                              <span className="flex items-center gap-1.5">
                                <FolderOpen className="size-3.5 text-primary/70" />
                                顶级菜单
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
                                        <LayoutList className="size-3.5 shrink-0 text-primary/70" />
                                      )}
                                      {o.name}
                                    </span>
                                  </SelectItem>
                                );
                              })}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field icon={Layers} label="资源类型" htmlFor="menu-type">
                        <Select
                          value={String(form.type)}
                          onValueChange={(v) =>
                            setForm({ ...form, type: Number(v) })
                          }
                        >
                          <SelectTrigger
                            id="menu-type"
                            className="w-full bg-muted/25 px-3 data-[size=default]:h-10"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">
                              目录 — 作为路由分组的容器
                            </SelectItem>
                            <SelectItem value="2">
                              菜单 — 绑定页面组件的路由项
                            </SelectItem>
                            <SelectItem value="3">
                              按钮 — 页面内的操作权限点
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    {typeInfo && (
                      <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary ring-1 ring-primary/10">
                        当前类型：
                        <span className="font-semibold">
                          {typeInfo.label}
                        </span>{" "}
                        — {typeInfo.desc}
                      </p>
                    )}
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
                          名称、路由与图标配置
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        icon={Tag}
                        label="菜单名称"
                        htmlFor="menu-name"
                        required
                      >
                        <Input
                          id="menu-name"
                          required
                          autoFocus
                          value={form.name}
                          placeholder="输入菜单显示名称"
                          onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                          }
                          className="h-10 bg-muted/25 px-3"
                        />
                      </Field>
                      {!isButton && (
                        <Field
                          icon={Paintbrush}
                          label="图标"
                          htmlFor="menu-icon"
                        >
                          <LucideIconPicker
                            id="menu-icon"
                            value={form.icon ?? ""}
                            onValueChange={(icon) =>
                              setForm({ ...form, icon })
                            }
                          />
                        </Field>
                      )}
                    </div>
                    {!isButton && (
                      <Field icon={Route} label="路由路径" htmlFor="menu-path">
                        <Input
                          id="menu-path"
                          value={form.path ?? ""}
                          placeholder="/users"
                          onChange={(e) =>
                            setForm({ ...form, path: e.target.value })
                          }
                          className="h-10 bg-muted/25 px-3 font-mono text-sm"
                        />
                      </Field>
                    )}
                  </section>

                  {/* 03 权限与接口 */}
                  <section className="space-y-4 border-t border-dashed pt-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        03
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">权限与接口</h3>
                        <p className="text-xs text-muted-foreground">
                          权限标识与后端接口绑定
                        </p>
                      </div>
                    </div>
                    <Field icon={Lock} label="权限标识" htmlFor="menu-perm">
                      <Input
                        id="menu-perm"
                        value={form.perm ?? ""}
                        placeholder="system:user:list"
                        onChange={(e) =>
                          setForm({ ...form, perm: e.target.value })
                        }
                        className="h-10 bg-muted/25 px-3 font-mono text-sm"
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                      <Field
                        icon={Globe}
                        label="接口路径"
                        htmlFor="menu-api-path"
                      >
                        <Input
                          id="menu-api-path"
                          value={form.api_path ?? ""}
                          placeholder="/api/v1/users"
                          onChange={(e) =>
                            setForm({ ...form, api_path: e.target.value })
                          }
                          className="h-10 bg-muted/25 px-3 font-mono text-sm"
                        />
                      </Field>
                      <Field
                        icon={Cable}
                        label="接口方法"
                        htmlFor="menu-api-method"
                      >
                        <Select
                          value={form.api_method || undefined}
                          onValueChange={(v) =>
                            setForm({ ...form, api_method: v })
                          }
                        >
                          <SelectTrigger
                            id="menu-api-method"
                            className="w-full bg-muted/25 px-3 font-mono text-sm data-[size=default]:h-10"
                          >
                            <SelectValue placeholder="选择" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                          </SelectContent>
                        </Select>
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
                          排序权重与可见性
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        icon={ArrowUpDown}
                        label="排序权重"
                        htmlFor="menu-sort"
                      >
                        <Input
                          id="menu-sort"
                          type="number"
                          value={form.sort ?? 0}
                          onChange={(e) =>
                            setForm({ ...form, sort: Number(e.target.value) })
                          }
                          className="h-10 bg-muted/25 px-3 font-mono tabular-nums"
                        />
                      </Field>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground/80">
                          <Eye className="size-3.5 text-primary" />
                          <span>菜单可见</span>
                        </Label>
                        <div className="flex h-10 items-center gap-3 rounded-lg bg-muted/25 px-3 ring-1 ring-foreground/10">
                          <span className="text-xs text-muted-foreground">
                            {form.visible === 1 ? "侧栏可见" : "侧栏隐藏"}
                          </span>
                          <Switch
                            id="menu-visible"
                            checked={form.visible === 1}
                            onCheckedChange={(checked) =>
                              setForm({ ...form, visible: checked ? 1 : 0 })
                            }
                          />
                        </div>
                      </div>
                    </div>
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
                    <LayoutList />
                    {editing ? "更新菜单" : "创建菜单"}
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
