import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Globe,
  Image,
  LoaderCircle,
  Monitor,
  Paintbrush,
  Save,
  Settings2,
  Sparkles,
  Type,
  Upload,
} from 'lucide-react'
import { Button } from "@/components/ui/button";
import { FormField as Field } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fileApi } from "@/lib/api/files";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { settingsApi } from "@/lib/api/settings";
import { PERM, usePermission } from "@/lib/permissions";
import type { AppSettings } from "@/lib/api/types";

/* ─── Page ──────────────────────────────────────────────────────── */

type EditableSettingKey =
  | "site_name"
  | "login_title"
  | "login_subtitle"
  | "login_background"
  | "logo_url";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const canEdit = usePermission(PERM.configEdit);
  const [edits, setEdits] = useState<Partial<AppSettings>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  });

  const mutation = useMutation({
    mutationFn: () => settingsApi.update(edits),
    onSuccess: () => {
      setEdits({});
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
      toast.success("设置已保存");
    },
  });

  function value(key: EditableSettingKey): string {
    return edits[key] ?? data?.[key] ?? "";
  }

  function set(key: EditableSettingKey, v: string) {
    setEdits((e) => ({ ...e, [key]: v }));
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const dirty = Object.keys(edits).length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Hero banner */}
      <section className="control-grid relative overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="absolute top-0 right-0 size-24 border-b border-l border-primary-foreground/15" />
        <div className="absolute -bottom-8 -left-8 size-32 rounded-full border border-primary-foreground/10" />
        <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_1fr] lg:items-end lg:p-8">
          <div className="flex max-w-xl flex-col items-start gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary-foreground/60">
                <Settings2 className="size-4" />
                <span className="font-mono text-[0.65rem] tracking-widest">
                  全局配置
                </span>
              </div>
              <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                系统设置
              </h1>
              <p className="text-sm leading-6 text-primary-foreground/70">
                站点名称、Logo 与登录页展示。修改后对所有用户即时生效。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 backdrop-blur-xs">
            {(
              [
                {
                  icon: Globe,
                  label: "作用域",
                  value: "全局",
                  caption: "全部用户",
                },
                {
                  icon: Sparkles,
                  label: "生效方式",
                  value: "即时",
                  caption: "无需重启",
                },
                {
                  icon: Paintbrush,
                  label: "配置项",
                  value: "5",
                  caption: "品牌与外观",
                },
              ] as const
            ).map(({ icon: Icon, label, value: v, caption }) => (
              <div
                key={label}
                className="flex min-w-0 flex-col gap-2 border-l border-primary-foreground/15 p-3 first:border-l-0 sm:p-4"
              >
                <div className="flex items-center gap-2 text-primary-foreground/55">
                  <Icon className="size-4" />
                  <span className="truncate font-mono text-[0.65rem] tracking-widest">
                    {label}
                  </span>
                </div>
                <strong className="truncate font-mono text-xl font-medium tabular-nums sm:text-2xl">
                  {v}
                </strong>
                <span className="truncate text-xs text-primary-foreground/65">
                  {caption}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left: Form */}
        <Card className="animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100 overflow-hidden rounded-xl border-0 shadow-sm ring-1 ring-black/6 dark:ring-white/8">
          <CardContent className="p-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              {/* 01 站点标识 */}
              <section className="space-y-5 px-5 pt-6 sm:px-7">
                <div className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    01
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">站点标识</h3>
                    <p className="text-xs text-muted-foreground">
                      站点名称与品牌展示
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field icon={Type} label="站点名称" htmlFor="s-site-name" required>
                    <Input
                      id="s-site-name"
                      value={value("site_name")}
                      placeholder="Rust Axum Admin"
                      disabled={!canEdit}
                      onChange={(e) => set("site_name", e.target.value)}
                      className="h-10 bg-muted/25 px-3"
                    />
                  </Field>
                  <Field icon={Image} label="Logo 图片地址" htmlFor="s-logo-url">
                    <ImageUploadInput
                      id="s-logo-url"
                      value={value("logo_url")}
                      placeholder="https://… (留空使用默认图标)"
                      disabled={!canEdit}
                      onChange={(v) => set("logo_url", v)}
                    />
                  </Field>
                </div>
              </section>

              {/* 02 登录页配置 */}
              <section className="space-y-5 border-t border-dashed px-5 pt-6 pb-6 sm:px-7">
                <div className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
                    02
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">登录页配置</h3>
                    <p className="text-xs text-muted-foreground">
                      标题、副标题与背景图
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field icon={Type} label="登录页标题" htmlFor="s-login-title" required>
                    <Input
                      id="s-login-title"
                      value={value("login_title")}
                      placeholder="Rust Axum Admin"
                      disabled={!canEdit}
                      onChange={(e) => set("login_title", e.target.value)}
                      className="h-10 bg-muted/25 px-3"
                    />
                  </Field>
                  <Field icon={Monitor} label="登录页副标题" htmlFor="s-login-subtitle">
                    <Input
                      id="s-login-subtitle"
                      value={value("login_subtitle")}
                      placeholder="多租户管理后台"
                      disabled={!canEdit}
                      onChange={(e) => set("login_subtitle", e.target.value)}
                      className="h-10 bg-muted/25 px-3"
                    />
                  </Field>
                </div>
                <Field
                  icon={Paintbrush}
                  label="登录页背景图地址"
                  htmlFor="s-login-bg"
                >
                  <ImageUploadInput
                    id="s-login-bg"
                    value={value("login_background")}
                    placeholder="https://… (留空使用默认背景)"
                    disabled={!canEdit}
                    onChange={(v) => set("login_background", v)}
                  />
                </Field>
              </section>

              {/* Footer */}
              <div className="flex flex-row items-center justify-between gap-3 border-t px-5 py-4 sm:px-7">
                {!canEdit && (
                  <p className="text-xs text-muted-foreground">
                    你没有「保存设置」权限，仅可查看。
                  </p>
                )}
                {canEdit && <span />}
                <Button
                  type="submit"
                  disabled={!canEdit || !dirty || mutation.isPending}
                  className="min-w-24"
                >
                  {mutation.isPending ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      保存中
                    </>
                  ) : (
                    <>
                      <Save />
                      保存设置
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right: Preview */}
        <Card className="animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200 overflow-hidden rounded-xl border-0 shadow-sm ring-1 ring-black/6 dark:ring-white/8">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Monitor className="size-4 text-primary" />
              <span className="text-sm font-semibold">实时预览</span>
            </div>

            {/* Background preview */}
            <div>
              <Label className="text-xs text-muted-foreground">登录页背景</Label>
              <div className="mt-2 flex h-44 items-center justify-center overflow-hidden rounded-lg border bg-muted/30 ring-1 ring-foreground/5">
                {value("login_background") ? (
                  <img
                    src={value("login_background")}
                    alt="背景预览"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground/60">
                    <Paintbrush className="size-5" />
                    <span className="text-xs">默认背景</span>
                  </div>
                )}
              </div>
            </div>

            {/* Logo + Site name preview */}
            <div>
              <Label className="text-xs text-muted-foreground">Logo 与站点名</Label>
              <div className="mt-2 flex h-20 items-center gap-4 rounded-lg border bg-muted/30 px-4 ring-1 ring-foreground/5">
                {value("logo_url") ? (
                  <img
                    src={value("logo_url")}
                    alt="Logo 预览"
                    className="h-10 w-10 rounded-md object-cover ring-1 ring-foreground/10"
                  />
                ) : (
                  <div className="grid size-10 place-items-center rounded-md bg-primary/10 ring-1 ring-primary/20">
                    <Globe className="size-5 text-primary/60" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {value("site_name") || "站点名称"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {value("login_subtitle") || "管理后台"}
                  </p>
                </div>
              </div>
            </div>

            {/* Login title preview */}
            <div>
              <Label className="text-xs text-muted-foreground">登录页标题</Label>
              <div className="mt-2 rounded-lg border bg-muted/30 px-4 py-3 ring-1 ring-foreground/5">
                <p className="text-sm font-medium">
                  {value("login_title") || "登录页标题"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {value("login_subtitle") || "登录页副标题"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── Field with icon ───────────────────────────────────────────── */


/* ─── Image upload input ────────────────────────────────────────── */

interface ImageUploadInputProps {
  id: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}

function ImageUploadInput({
  id,
  value,
  placeholder,
  disabled,
  onChange,
}: ImageUploadInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useMutation({
    mutationFn: (file: File) => fileApi.upload(file, true),
    onSuccess: (item) => {
      onChange(`${window.location.origin}${item.url}`);
      toast.success("上传成功");
    },
    onSettled: () => {
      if (inputRef.current) inputRef.current.value = "";
    },
  });

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 bg-muted/25 px-3 font-mono text-sm"
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || upload.isPending}
        onClick={() => inputRef.current?.click()}
        className="size-10 shrink-0"
      >
        {upload.isPending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
      </Button>
    </div>
  );
}
