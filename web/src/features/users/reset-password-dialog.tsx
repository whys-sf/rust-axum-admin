import { useForm } from "@tanstack/react-form";
import { KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogHeroHeader } from "@/components/common/dialog-hero-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResetPasswordDialogProps {
  username: string;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (password: string) => void;
}

export function ResetPasswordDialog({
  username,
  saving,
  onCancel,
  onSubmit,
}: ResetPasswordDialogProps) {
  const form = useForm({
    defaultValues: {
      password: "",
    },
    onSubmit: ({ value }) => {
      if (saving || value.password.length < 6) return;
      onSubmit(value.password);
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-lg dark:ring-white/10"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
          className="flex min-h-0 flex-col"
        >
          <DialogHeroHeader
            icon={KeyRound}
            eyebrow="凭证更新"
            title="重置登录密码"
            description={`为用户「${username}」设置新的登录密码。`}
            aside={
              <div className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-background text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
                <KeyRound className="size-5 text-primary" />
              </div>
            }
          />

          <div className="px-5 pt-7 sm:px-7">
            <section className="space-y-4 pb-7">
              <div className="flex items-center gap-3">
                <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  01
                </span>
                <div>
                  <h3 className="text-sm font-semibold">新密码</h3>
                  <p className="text-xs text-muted-foreground">
                    保存后旧密码将立即失效
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="reset-password"
                  className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground/80"
                >
                  <KeyRound className="size-3.5 text-primary" />
                  <span>
                    登录密码
                    <span aria-hidden="true" className="ml-0.5 text-destructive">
                      *
                    </span>
                  </span>
                </Label>
                <form.Field name="password">
                  {(field) => {
                    const passwordValid = field.state.value.length >= 6;
                    return (
                      <>
                        <Input
                          id="reset-password"
                          autoFocus
                          type="password"
                          autoComplete="new-password"
                          placeholder="至少 6 个字符"
                          value={field.state.value}
                          aria-invalid={field.state.value.length > 0 && !passwordValid}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          className="h-10 bg-muted/25 px-3"
                        />
                        {field.state.value.length > 0 && !passwordValid && (
                          <p className="text-xs text-destructive">
                            密码至少需要 6 个字符
                          </p>
                        )}
                      </>
                    );
                  }}
                </form.Field>
              </div>
            </section>
          </div>

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
              <form.Subscribe selector={(state) => state.values.password}>
                {(password) => (
                  <Button
                    type="submit"
                    disabled={saving || password.length < 6}
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
                        重置密码
                      </>
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
