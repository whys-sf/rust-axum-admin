import { useState, type ReactNode } from "react";
import { LoaderCircle, ShieldAlert, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogHeroHeader } from "@/components/common/dialog-hero-header";

interface DeleteConfirmDialogProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  targetLabel?: ReactNode;
  targetName: ReactNode;
  targetDescription?: ReactNode;
  saving?: boolean;
  onCancel?: () => void;
  onConfirm: () => unknown | Promise<unknown>;
}

export function DeleteConfirmDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description = "此操作不可撤销，请确认后继续。",
  targetLabel = "删除对象",
  targetName,
  targetDescription,
  saving,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const controlled = open !== undefined;
  const currentOpen = controlled ? open : internalOpen;
  const busy = saving ?? loading;

  function setOpen(next: boolean) {
    if (!next) onCancel?.();
    if (controlled) onOpenChange?.(next);
    else setInternalOpen(next);
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={currentOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-lg dark:ring-white/10"
      >
        <DialogHeroHeader
          icon={ShieldAlert}
          eyebrow="高风险操作"
          title={title}
          description={description}
          tone="destructive"
          aside={
            <div className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-background text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
              <Trash2 className="size-5 text-destructive" />
            </div>
          }
        />

        <div className="px-5 pt-7 sm:px-7">
          <section className="space-y-4 pb-7">
            <div className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-full bg-destructive text-[10px] font-bold text-white">
                01
              </span>
              <div>
                <h3 className="text-sm font-semibold">删除确认</h3>
                <p className="text-xs text-muted-foreground">
                  即将删除该记录及其关联配置
                </p>
              </div>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">{targetLabel}</p>
              <p className="mt-1 break-all text-base font-semibold">
                {targetName}
              </p>
              {targetDescription && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {targetDescription}
                </p>
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="mx-0 mb-0 mt-auto flex-row items-center justify-end rounded-none px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirm()}
              disabled={busy}
              className="min-w-24"
            >
              {busy ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  删除中
                </>
              ) : (
                <>
                  <Trash2 />
                  确认删除
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
