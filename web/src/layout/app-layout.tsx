import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  BookA,
  Briefcase,
  Building2,
  ChevronsUpDown,
  Megaphone,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Clock,
  Code2,
  FolderArchive,
  Menu as MenuIcon,
  ScrollText,
  Network,
  MonitorDot,
  Activity,
  Settings,
  SlidersHorizontal,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { UnreadBell } from "@/features/messages/unread-bell";
import { authApi } from "@/lib/api/auth";
import { settingsApi } from "@/lib/api/settings";
import { useAuthStore } from "@/stores/auth";
import type { AppSettings, MenuNode, UserInfo } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface NavLink {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  links: NavLink[];
}

const DASHBOARD: NavLink = { to: "/", label: "仪表盘", icon: LayoutDashboard };

/** Maps a backend menu (keyed by its perm) to the SPA route + icon to render.
 *  Backend menu `path` (e.g. `/system/user`) differs from the file-based route
 *  (`/users`), so we resolve by the stable permission string. */
const ROUTE_BY_PERM: Record<string, { to: string; icon: LucideIcon }> = {
  "system:user:list": { to: "/users", icon: Users },
  "system:role:list": { to: "/roles", icon: ShieldCheck },
  "system:menu:list": { to: "/menus", icon: MenuIcon },
  "system:dept:list": { to: "/depts", icon: Network },
  "system:dict:list": { to: "/dict", icon: BookA },
  "system:post:list": { to: "/posts", icon: Briefcase },
  "system:param:list": { to: "/params", icon: SlidersHorizontal },
  "system:notice:list": { to: "/notices", icon: Megaphone },
  "system:message:list": { to: "/messages", icon: Mail },
  "system:job:list": { to: "/jobs", icon: Clock },
  "system:gen:list": { to: "/gen", icon: Code2 },
  "system:file:list": { to: "/files", icon: FolderArchive },
  "system:online:list": { to: "/online", icon: MonitorDot },
  "system:monitor:list": { to: "/monitor", icon: Activity },
  "system:log:list": { to: "/logs", icon: ScrollText },
  "system:config:list": { to: "/settings", icon: Settings },
  "platform:tenant:list": { to: "/tenants", icon: Building2 },
};

function resolveLink(node: MenuNode): NavLink | null {
  const route = node.perm ? ROUTE_BY_PERM[node.perm] : undefined;
  if (!route) return null;
  return { to: route.to, label: node.name, icon: route.icon };
}

/** Build the sidebar nav from the backend menu tree. Directories (type 1)
 *  become groups; top-level menus (type 2) join the dashboard under 导航. */
function buildNav(tree: MenuNode[]): NavGroup[] {
  const topLinks: NavLink[] = [];
  const groups: NavGroup[] = [];
  for (const node of tree) {
    if (node.type === 1) {
      const links = node.children
        .map(resolveLink)
        .filter((l): l is NavLink => l !== null);
      if (links.length) groups.push({ label: node.name, links });
    } else {
      const link = resolveLink(node);
      if (link) topLinks.push(link);
    }
  }
  return [{ label: "导航", links: [DASHBOARD, ...topLinks] }, ...groups];
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);

  const { data: info } = useQuery({
    queryKey: ["userinfo"],
    queryFn: authApi.userinfo,
  });

  const { data: menuTree } = useQuery({
    queryKey: ["nav-menus"],
    queryFn: authApi.menus,
  });

  const { data: settings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: settingsApi.public,
  });

  useEffect(() => {
    if (info) setUser(info);
  }, [info, setUser]);

  const current = info ?? user;
  const groups = buildNav(menuTree ?? []);
  const allLinks = groups.flatMap((g) => g.links);
  const displayName = current?.nickname || current?.username || "用户";

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout
    }
    clear();
    navigate({ to: "/login" });
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarHeaderContent
            settings={settings}
            current={current}
          ></SidebarHeaderContent>
          {/*<div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="logo"
                  className="size-8 object-cover"
                />
              ) : (
                <ShieldCheck className="size-4" />
              )}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold">
                {settings?.site_name || "Axum Admin"}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {current?.tenant_name ?? "多租户管理后台"}
              </span>
            </div>
          </div>*/}
        </SidebarHeader>
        <SidebarContent>
          {groups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.links.map((item) => {
                    const active =
                      item.to === "/"
                        ? location.pathname === "/"
                        : location.pathname.startsWith(item.to);
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.label}
                        >
                          <Link to={item.to}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent"
                  >
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        {displayName.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {displayName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {(current?.roles ?? []).join(", ") || "—"}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
                  side="top"
                  align="start"
                >
                  <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/profile" })}
                  >
                    <KeyRound className="mr-2 size-4" />
                    修改密码
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 size-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-base font-medium">
            {allLinks.find((i) =>
              i.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(i.to),
            )?.label ?? "个人中心"}
          </h1>
          <div className="ml-auto flex items-center gap-1">
            <UnreadBell />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function SidebarHeaderContent({
  settings,
  current,
}: {
  settings?: AppSettings;
  current?: UserInfo | null;
}) {
  const { open } = useSidebar();
  return (
    <div
      className={cn(
        open
          ? "flex items-center gap-2 px-2 py-1.5"
          : "flex items-center justify-center  pt-3",
      )}
    >
      <div
        className={cn(
          "flex aspect-square  items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground",
          open ? "size-8" : "size-5",
        )}
      >
        {settings?.logo_url ? (
          <img
            src={settings.logo_url}
            alt="logo"
            className="size-8 object-cover"
          />
        ) : (
          <ShieldCheck className={cn(open ? "size-4" : "size-8")} />
        )}
      </div>
      <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate font-semibold">
          {settings?.site_name || "Axum Admin"}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {current?.tenant_name ?? "多租户管理后台"}
        </span>
      </div>
    </div>
  );
}
