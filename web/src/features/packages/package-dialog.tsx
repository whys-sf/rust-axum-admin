import { useMemo, useState } from 'react'
import { Boxes, LoaderCircle, PackageCheck, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DialogHeroHeader } from '@/components/common/dialog-hero-header'
import { FormField as Field } from '@/components/common/form-field'
import type {
  CreatePackagePayload,
  UpdatePackagePayload,
} from '@/lib/api/package'
import type { Feature, Package } from '@/lib/api/types'

interface PackageDialogProps {
  editing?: Package
  features: Feature[]
  saving: boolean
  onCancel: () => void
  onCreate: (payload: CreatePackagePayload) => void
  onUpdate: (id: string, payload: UpdatePackagePayload) => void
}

export function PackageDialog({
  editing,
  features,
  saving,
  onCancel,
  onCreate,
  onUpdate,
}: PackageDialogProps) {
  const [form, setForm] = useState({
    code: editing?.code ?? '',
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    status: editing?.status ?? 1,
    sort: editing?.sort ?? 0,
    default_user_limit: editing?.default_user_limit ?? 50,
    feature_codes: editing?.feature_codes ?? features.map((item) => item.code),
  })

  const enabledFeatures = useMemo(
    () => features.filter((item) => item.status === 1),
    [features],
  )
  const selected = new Set(form.feature_codes)
  const nameValid = form.name.trim().length >= 2
  const codeValid = form.code.trim().length >= 2
  const limitValid =
    Number.isFinite(form.default_user_limit) && form.default_user_limit >= 0
  const valid = editing
    ? nameValid && limitValid
    : nameValid && codeValid && limitValid

  function toggleFeature(code: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      feature_codes: checked
        ? Array.from(new Set([...current.feature_codes, code]))
        : current.feature_codes.filter((item) => item !== code),
    }))
  }

  function submit(event?: React.FormEvent) {
    event?.preventDefault()
    if (!valid || saving) return

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      sort: form.sort,
      default_user_limit: form.default_user_limit,
      feature_codes: form.feature_codes,
    }
    if (editing) {
      onUpdate(editing.id, payload)
      return
    }
    onCreate({ ...payload, code: form.code.trim() })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-3xl dark:ring-white/10"
      >
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <DialogHeroHeader
            icon={Boxes}
            eyebrow={editing ? '套餐更新' : '新增套餐'}
            title={editing ? '编辑套餐能力' : '创建 SaaS 套餐'}
            description="维护租户可购买的功能集合和默认用户配额。"
            aside={
              <div className="relative hidden shrink-0 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80 sm:block">
                <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                  已选功能
                </p>
                <p className="mt-0.5 font-mono text-xs font-bold text-foreground">
                  {form.feature_codes.length}/{enabledFeatures.length}
                </p>
              </div>
            }
          />
          <ScrollArea className="max-h-[62vh]">
            <div className="space-y-7 px-5 py-7 sm:px-7">
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    01
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">套餐信息</h3>
                    <p className="text-xs text-muted-foreground">
                      用于租户绑定、售卖和默认配额
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field icon={Boxes} label="套餐名称" htmlFor="package-name" required>
                    <Input
                      id="package-name"
                      required
                      autoFocus
                      value={form.name}
                      placeholder="例如：专业版"
                      aria-invalid={form.name.length > 0 && !nameValid}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                      className="h-10 bg-muted/25 px-3"
                    />
                  </Field>
                  <Field
                    icon={PackageCheck}
                    label="套餐编码"
                    htmlFor="package-code"
                    required={!editing}
                  >
                    <Input
                      id="package-code"
                      required={!editing}
                      disabled={!!editing}
                      value={form.code}
                      placeholder="例如：pro"
                      aria-invalid={!editing && form.code.length > 0 && !codeValid}
                      onChange={(event) =>
                        setForm({ ...form, code: event.target.value })
                      }
                      className="h-10 bg-muted/25 px-3 font-mono"
                    />
                  </Field>
                  <Field
                    icon={SlidersHorizontal}
                    label="默认用户上限"
                    htmlFor="package-user-limit"
                    required
                  >
                    <Input
                      id="package-user-limit"
                      required
                      min={0}
                      type="number"
                      value={form.default_user_limit}
                      aria-invalid={!limitValid}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          default_user_limit: Number(event.target.value),
                        })
                      }
                      className="h-10 bg-muted/25 px-3"
                    />
                  </Field>
                  <Field icon={SlidersHorizontal} label="排序" htmlFor="package-sort">
                    <Input
                      id="package-sort"
                      type="number"
                      value={form.sort}
                      onChange={(event) =>
                        setForm({ ...form, sort: Number(event.target.value) })
                      }
                      className="h-10 bg-muted/25 px-3"
                    />
                  </Field>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">套餐状态</p>
                    <p className="text-xs text-muted-foreground">
                      停用后不能再被新租户绑定
                    </p>
                  </div>
                  <Switch
                    checked={form.status === 1}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, status: checked ? 1 : 0 })
                    }
                  />
                </div>
                <Field icon={PackageCheck} label="套餐说明" htmlFor="package-description">
                  <Textarea
                    id="package-description"
                    rows={2}
                    value={form.description}
                    placeholder="面向销售、运营或客户成功团队的套餐说明..."
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                    className="min-h-18 resize-none bg-muted/25 px-3"
                  />
                </Field>
              </section>

              <section className="space-y-4 border-t border-dashed pt-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    02
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">功能开关</h3>
                    <p className="text-xs text-muted-foreground">
                      租户登录后只会看到套餐启用的业务模块
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {enabledFeatures.map((feature) => (
                    <label
                      key={feature.code}
                      className="flex min-h-20 cursor-pointer gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={selected.has(feature.code)}
                        onCheckedChange={(checked) =>
                          toggleFeature(feature.code, checked === true)
                        }
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {feature.name}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {feature.description || feature.code}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            </div>
          </ScrollArea>
          <DialogFooter className="mx-0 mb-0 mt-auto flex-row items-center justify-end rounded-none px-5 py-4 sm:px-7">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
              取消
            </Button>
            <Button type="submit" disabled={saving || !valid} className="min-w-24">
              {saving ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  保存中
                </>
              ) : (
                <>
                  <Boxes />
                  {editing ? '更新套餐' : '创建套餐'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
