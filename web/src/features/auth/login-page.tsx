import { useState, type SubmitEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Building2,
  Cpu,
  Fingerprint,
  Gauge,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  MonitorDot,
  ScanFace,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { authApi } from "@/lib/api/auth";
import { settingsApi } from "@/lib/api/settings";
import { useAuthStore } from "@/stores/auth";

const baseSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(6, "密码至少 6 位"),
});

const tenantLoginSchema = baseSchema.extend({
  tenant_code: z.string().min(2, "请输入租户编码"),
});

function loginReasonMessage(reason: string | null): string {
  switch (reason) {
    case "tenant_disabled":
      return "租户已被禁用，请联系平台管理员。";
    case "tenant_expired":
      return "租户已过期，请联系平台管理员。";
    case "expired":
      return "登录已过期，请重新登录。";
    default:
      return "";
  }
}

export function LoginPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({
    tenant_code: "",
    username: "admin",
    password: "Admin@123456",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: settings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: settingsApi.public,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const resp = await authApi.login(
        showTenantLogin ? form : { username: form.username, password: form.password },
      );
      setTokens(resp.access_token, resp.refresh_token);
      const info = await authApi.userinfo();
      setUser(info);
      return info;
    },
    onSuccess: (info) => {
      toast.success(`欢迎回来，${info.nickname || info.username}`);
      navigate({ to: "/" });
    },
  });

  function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const showTenantLogin = settings?.show_tenant_login === true;
    const schema = showTenantLogin ? tenantLoginSchema : baseSchema;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    mutation.mutate();
  }

  const bg = settings?.login_background;
  const title = settings?.login_title || "Rust Axum Admin";
  const subtitle = settings?.login_subtitle || "多租户管理后台";
  const showTenantLogin = settings?.show_tenant_login === true;
  const reasonMessage = loginReasonMessage(
    new URLSearchParams(window.location.search).get("reason"),
  );

  return (
    <div className="relative flex min-h-svh overflow-hidden">
      {/* ── Scoped animation keyframes ── */}
      <style>{`
        @keyframes login-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes login-glow-pulse {
          0%,100% { opacity:.55; transform:translate(-50%,-50%) scale(1); }
          50%     { opacity:.9; transform:translate(-50%,-50%) scale(1.08); }
        }
        @keyframes login-ring-rotate {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
        @keyframes login-dot-blink {
          0%,100% { opacity:1; }
          50%     { opacity:.3; }
        }
        .login-anim-up      { animation: login-fade-up .55s cubic-bezier(.16,1,.3,1) both; }
        .login-anim-up-d1   { animation: login-fade-up .55s cubic-bezier(.16,1,.3,1) .08s both; }
        .login-anim-up-d2   { animation: login-fade-up .55s cubic-bezier(.16,1,.3,1) .16s both; }
        .login-anim-up-d3   { animation: login-fade-up .55s cubic-bezier(.16,1,.3,1) .24s both; }
        .login-anim-up-d4   { animation: login-fade-up .55s cubic-bezier(.16,1,.3,1) .32s both; }
        .login-anim-up-d5   { animation: login-fade-up .55s cubic-bezier(.16,1,.3,1) .40s both; }
        .login-anim-up-d6   { animation: login-fade-up .55s cubic-bezier(.16,1,.3,1) .48s both; }
      `}</style>

      {/* ═══════════════════════════════════════════════
           LEFT — Atmospheric Visual Panel
           ═══════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col">
        {/* -- background -- */}
        {bg ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${bg})` }}
            />
            <div className="absolute inset-0 bg-black/50" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[#15151a]">
            {/* Primary glow — upper area */}
            <div
              className="absolute top-[25%] left-[40%] size-135 rounded-full blur-[120px] bg-primary/30"
              style={{ animation: "login-glow-pulse 6s ease-in-out infinite" }}
            />
            {/* Secondary glow — lower right */}
            <div className="absolute bottom-[15%] right-[15%] size-70 rounded-full blur-[90px] bg-primary/20 opacity-60" />
            {/* Tertiary subtle warmth */}
            <div className="absolute top-[65%] left-[15%] size-55 rounded-full blur-[70px] bg-primary/12 opacity-80" />

            {/* Decorative rotating rings — behind hero text */}
            <div className="absolute top-[22%] left-1/2 size-70 -translate-x-1/2">
              <div
                className="absolute inset-0 rounded-full border border-white/8"
                style={{ animation: "login-ring-rotate 90s linear infinite" }}
              />
              <div
                className="absolute inset-4 rounded-full border border-dashed border-white/5"
                style={{
                  animation: "login-ring-rotate 120s linear infinite reverse",
                }}
              />
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-primary/80 shadow-[0_0_8px_var(--primary)]"
                style={{ animation: "login-ring-rotate 90s linear infinite" }}
              />
            </div>

            {/* Corner decoration — top-right */}
            <div className="absolute top-8 right-8">
              <div className="size-16 border border-white/[0.07] rounded-sm rotate-45" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 border border-primary/20 rounded-sm rotate-12" />
            </div>

            {/* Corner decoration — bottom-left */}
            <div className="absolute bottom-20 left-8">
              <div className="size-10 rounded-full border border-white/6" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-4 border border-primary/15 rounded-full" />
            </div>
          </div>
        )}

        {/* Grid overlay */}
        <div className="absolute inset-0 control-grid opacity-[0.04]" />

        {/* ── Content ── */}
        <div className="relative z-10 flex flex-col h-full p-12 xl:p-16">
          {/* Top — Brand */}
          <div className="login-anim-up flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {settings?.logo_url && (
                <img
                  src={settings.logo_url}
                  alt="logo"
                  className="size-8 rounded object-cover brightness-200"
                />
              )}
              <div className="flex items-center gap-2 text-white/65 text-xs font-medium tracking-[0.18em] uppercase">
                <ShieldCheck className="size-3.5" />
                安全接入
              </div>
            </div>
            {/* Mini tech badges */}
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/4 px-2 py-0.5 font-mono text-[10px] tracking-tight text-white/45">
                Rust
              </span>
              <span className="rounded-full border border-white/10 bg-white/4 px-2 py-0.5 font-mono text-[10px] tracking-tight text-white/45">
                Axum
              </span>
            </div>
          </div>

          {/* Center — Hero */}
          <div className="mt-10 mb-8 max-w-md login-anim-up-d1">
            <h1 className="text-[2.5rem] xl:text-[2.75rem] font-extralight tracking-tight text-white leading-[1.15]">
              {title}
            </h1>
            <div className="mt-4 h-px w-14 bg-primary/60" />
            <p className="mt-4 text-[15px] text-white/55 font-light leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Feature highlights — 2x2 grid */}
          <div className="grid grid-cols-2 gap-3 login-anim-up-d2">
            <FeatureCard
              icon={<Layers className="size-4" />}
              title={showTenantLogin ? "多租户隔离" : "数据隔离"}
              desc={showTenantLogin ? "数据完全隔离，独立命名空间" : "默认租户上下文，访问边界清晰"}
            />
            <FeatureCard
              icon={<Fingerprint className="size-4" />}
              title="RBAC 权限"
              desc="角色/菜单/数据级细粒度控制"
            />
            <FeatureCard
              icon={<MonitorDot className="size-4" />}
              title="实时监控"
              desc="CPU / 内存 / Redis 秒级刷新"
            />
            <FeatureCard
              icon={<ScanFace className="size-4" />}
              title="操作审计"
              desc="全链路日志追踪与留痕"
            />
          </div>

          {/* Terminal snippet */}
          <div className="mt-6 login-anim-up-d3">
            <div className="overflow-hidden rounded-lg border border-white/8 bg-white/4 backdrop-blur-sm">
              {/* Terminal header */}
              <div className="flex items-center gap-1.5 border-b border-white/6 px-3 py-2">
                <span className="size-2 rounded-full bg-red-400/70" />
                <span className="size-2 rounded-full bg-yellow-400/70" />
                <span className="size-2 rounded-full bg-green-400/70" />
                <span className="ml-2 text-[10px] text-white/35 font-mono">
                  cargo run --release
                </span>
              </div>
              {/* Terminal body */}
              <div className="px-4 py-3 font-mono text-[11px] leading-[1.7] text-white/50 select-none">
                <div>
                  <span className="text-emerald-400/80">$</span> cargo run
                  --release
                </div>
                <div className="text-white/30">
                  {" "}
                  Compiling rust-axum-admin v1.0.0
                </div>
                <div className="text-white/30">
                  {" "}
                  Finished release [optimized] target(s)
                </div>
                <div>
                  <span className="text-emerald-400/80">$</span>{" "}
                  <span className="text-primary/70">
                    Server running on 0.0.0.0:5173
                  </span>{" "}
                  <span
                    className="ml-1 inline-block size-1.5 -translate-y-px rounded-full bg-emerald-400/70"
                    style={{
                      animation: "login-dot-blink 1.5s ease-in-out infinite",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Flex spacer */}
          <div className="flex-1 min-h-4" />

          {/* Bottom — Status + Tech stack */}
          <div className="login-anim-up-d4 flex items-end justify-between">
            {/* Status strip */}
            <div className="flex items-center gap-3 text-white/35 text-[11px] tabular-nums select-none">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block size-1.25 rounded-full bg-emerald-400"
                  style={{
                    animation: "login-dot-blink 2.5s ease-in-out infinite",
                  }}
                />
                运行中
              </span>
              <span className="size-0.75 rounded-full bg-white/25" />
              <span>v1.0.0</span>
            </div>

            {/* Tech stack icons */}
            <div className="flex items-center gap-3">
              <TechBadge icon={<Cpu className="size-3" />} label="Tokio" />
              <TechBadge icon={<Zap className="size-3" />} label="SQLx" />
              <TechBadge icon={<Gauge className="size-3" />} label="Redis" />
              <TechBadge icon={<Lock className="size-3" />} label="JWT" />
            </div>
          </div>
        </div>

        {/* Right-edge gradient line */}
        <div className="absolute right-0 inset-y-0 w-px bg-linear-to-b from-transparent via-primary/35 to-transparent" />
      </div>

      {/* ═══════════════════════════════════════════════
           RIGHT — Form Panel
           ═══════════════════════════════════════════════ */}
      <div className="flex w-full lg:w-[45%] flex-col bg-background transition-colors">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 lg:px-10 lg:py-6 login-anim-up">
          {/* Mobile branding */}
          <div className="flex items-center gap-3 lg:hidden">
            {settings?.logo_url && (
              <img
                src={settings.logo_url}
                alt="logo"
                className="size-8 rounded-md object-cover"
              />
            )}
            <div>
              <p className="text-sm font-semibold leading-tight">{title}</p>
              <p className="text-[11px] text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="hidden lg:block" />
          <ThemeToggle />
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-6 pb-16 lg:px-12">
          <div className="w-full max-w-85">
            {/* Heading */}
            <div className="mb-9 login-anim-up-d1">
              <h2 className="text-[1.65rem] font-semibold tracking-tight leading-tight">
                登录
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                输入凭据以访问管理后台
              </p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-5">
              {reasonMessage && (
                <div className="rounded-md border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-destructive">
                  {reasonMessage}
                </div>
              )}

              {showTenantLogin && (
                <div className="login-anim-up-d2">
                  <Field
                    id="tenant_code"
                    label="租户编码"
                    icon={<Building2 className="size-3.5" />}
                    value={form.tenant_code}
                    placeholder="如 demo / platform"
                    error={errors.tenant_code}
                    onChange={(v) => setForm({ ...form, tenant_code: v })}
                  />
                </div>
              )}

              <div className="login-anim-up-d3">
                <Field
                  id="username"
                  label="用户名"
                  icon={<User className="size-3.5" />}
                  value={form.username}
                  placeholder="用户名"
                  error={errors.username}
                  onChange={(v) => setForm({ ...form, username: v })}
                />
              </div>

              <div className="login-anim-up-d4">
                <Field
                  id="password"
                  label="密码"
                  type="password"
                  icon={<KeyRound className="size-3.5" />}
                  value={form.password}
                  placeholder="密码"
                  error={errors.password}
                  onChange={(v) => setForm({ ...form, password: v })}
                />
              </div>

              <div className="login-anim-up-d5 pt-1">
                <Button
                  type="submit"
                  className="w-full h-10 tracking-wide"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  登录
                </Button>
              </div>

              <div className="login-anim-up-d6 pt-1">
                <p className="text-center text-[11px] text-muted-foreground/70">
                  {showTenantLogin
                    ? "演示账号：demo / admin / Admin@123456"
                    : "演示账号：admin / Admin@123456"}
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile-only bottom atmospheric strip */}
      <div className="fixed inset-x-0 bottom-0 h-1 bg-linear-to-r from-primary/0 via-primary/40 to-primary/0 lg:hidden" />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Field component (refined styling)
   ────────────────────────────────────────────── */
interface FieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  error?: string;
  onChange: (v: string) => void;
}

function Field({
  id,
  label,
  value,
  placeholder,
  type = "text",
  icon,
  error,
  onChange,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="text-xs font-medium text-muted-foreground/90"
      >
        {label}
      </Label>
      <div className="relative group">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-primary/70">
            {icon}
          </span>
        )}
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          className={`h-9.5 text-sm bg-muted/40 border-muted-foreground/10 focus:bg-background transition-colors ${
            icon ? "pl-9" : ""
          } ${error ? "border-destructive/60 focus-visible:ring-destructive/30" : "focus-visible:border-primary/30 focus-visible:ring-primary/15"}`}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Feature Card — Left panel highlight
   ────────────────────────────────────────────── */
function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group rounded-lg border border-white/8 bg-white/4 p-3.5 backdrop-blur-sm transition-colors hover:border-primary/25 hover:bg-white/[0.07]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-primary/80 group-hover:text-primary transition-colors">
          {icon}
        </span>
        <span className="text-[12.5px] font-medium text-white/75 group-hover:text-white/90 transition-colors">
          {title}
        </span>
      </div>
      <p className="text-[11px] text-white/40 leading-relaxed group-hover:text-white/55 transition-colors">
        {desc}
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Tech Badge — Bottom tech stack pill
   ────────────────────────────────────────────── */
function TechBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1 text-white/35 hover:text-white/55 transition-colors">
      {icon}
      <span className="text-[10px] font-mono tracking-tight">{label}</span>
    </div>
  );
}
