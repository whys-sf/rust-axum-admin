import { useState } from "react";
import {
  LoaderCircle,
  ShieldCheck,
  UserCog,
  UsersRound,
} from 'lucide-react'
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogHeroHeader } from "@/components/common/dialog-hero-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Role } from "@/lib/api/types";

interface AssignRolesDialogProps {
  username: string;
  roles: Role[];
  selected: string[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (roleIds: string[]) => void;
}

export function AssignRolesDialog({
  username,
  roles,
  selected,
  saving,
  onCancel,
  onSubmit,
}: AssignRolesDialogProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set(selected));

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-xl dark:ring-white/10"
      >
        <DialogHeroHeader
          icon={UserCog}
          eyebrow="权限边界"
          title="分配成员角色"
          description={`为用户「${username}」配置可访问的系统角色。`}
          aside={
            <div className="relative flex shrink-0 items-center gap-3 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
              <UsersRound className="size-5 text-primary" />
              <div>
                <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                  已选择
                </p>
                <p className="text-xs font-bold text-foreground">
                  {checked.size} 个角色
                </p>
              </div>
            </div>
          }
        />

        <ScrollArea className="max-h-[54vh]">
          <div className="px-5 pt-7 sm:px-7">
            <section className="space-y-4 pb-7">
              <div className="flex items-center gap-3">
                <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  01
                </span>
                <div>
                  <h3 className="text-sm font-semibold">角色清单</h3>
                  <p className="text-xs text-muted-foreground">
                    勾选后会覆盖该成员当前的角色集合
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                {roles.map((role) => {
                  const active = checked.has(role.id);
                  return (
                    <label
                      key={role.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border bg-muted/20 p-3 transition-colors hover:bg-accent/70"
                    >
                      <Checkbox
                        checked={active}
                        onCheckedChange={() => toggle(role.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {role.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {role.code}
                        </div>
                      </div>
                      {active && (
                        <ShieldCheck className="size-4 text-primary" />
                      )}
                    </label>
                  );
                })}
                {roles.length === 0 && (
                  <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    暂无可分配的角色
                  </div>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="mx-0 mb-0 mt-auto flex-row items-center justify-end rounded-none px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={saving}>
              取消
            </Button>
            <Button
              onClick={() => onSubmit([...checked])}
              disabled={saving}
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
                  保存角色
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
