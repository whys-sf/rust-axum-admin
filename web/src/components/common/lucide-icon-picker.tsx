import { useMemo, useState } from "react";
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChartNoAxesColumn,
  Check,
  ChevronDown,
  CircleGauge,
  ClipboardList,
  Code2,
  Cog,
  Database,
  FileText,
  FolderTree,
  Gauge,
  Globe,
  HardDrive,
  House,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  ListTree,
  Lock,
  Mail,
  MessageSquare,
  Monitor,
  Network,
  PanelLeft,
  Puzzle,
  Radar,
  Route,
  ScanLine,
  ScrollText,
  Search,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  SquareMenu,
  TableProperties,
  Tag,
  Terminal,
  Upload,
  UserCog,
  UserRound,
  Users,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface IconOption {
  name: string;
  label: string;
  tags: string[];
  icon: LucideIcon;
}

interface LucideIconPickerProps {
  id?: string;
  value?: string | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onValueChange: (value: string) => void;
}

const ICON_OPTIONS: IconOption[] = [
  { name: "LayoutDashboard", label: "仪表盘", tags: ["dashboard", "home"], icon: LayoutDashboard },
  { name: "House", label: "首页", tags: ["home"], icon: House },
  { name: "Users", label: "用户", tags: ["user", "member"], icon: Users },
  { name: "UserCog", label: "用户设置", tags: ["user", "setting"], icon: UserCog },
  { name: "UserRound", label: "成员", tags: ["profile", "account"], icon: UserRound },
  { name: "ShieldCheck", label: "角色权限", tags: ["role", "auth"], icon: ShieldCheck },
  { name: "Shield", label: "安全", tags: ["security"], icon: Shield },
  { name: "KeyRound", label: "密钥", tags: ["password", "credential"], icon: KeyRound },
  { name: "Lock", label: "权限锁", tags: ["permission"], icon: Lock },
  { name: "FolderTree", label: "菜单树", tags: ["menu", "tree"], icon: FolderTree },
  { name: "SquareMenu", label: "菜单", tags: ["menu"], icon: SquareMenu },
  { name: "LayoutList", label: "列表", tags: ["list"], icon: LayoutList },
  { name: "LayoutGrid", label: "网格", tags: ["grid"], icon: LayoutGrid },
  { name: "ListTree", label: "层级", tags: ["tree"], icon: ListTree },
  { name: "PanelLeft", label: "侧栏", tags: ["sidebar"], icon: PanelLeft },
  { name: "Route", label: "路由", tags: ["path"], icon: Route },
  { name: "Puzzle", label: "组件", tags: ["component"], icon: Puzzle },
  { name: "Network", label: "组织架构", tags: ["dept", "network"], icon: Network },
  { name: "Building2", label: "租户组织", tags: ["tenant", "company"], icon: Building2 },
  { name: "BriefcaseBusiness", label: "岗位", tags: ["post", "job"], icon: BriefcaseBusiness },
  { name: "BookOpen", label: "字典", tags: ["dict", "book"], icon: BookOpen },
  { name: "SlidersHorizontal", label: "参数配置", tags: ["params", "config"], icon: SlidersHorizontal },
  { name: "Settings", label: "系统设置", tags: ["settings"], icon: Settings },
  { name: "Cog", label: "配置", tags: ["config"], icon: Cog },
  { name: "Bell", label: "通知", tags: ["notice"], icon: Bell },
  { name: "MessageSquare", label: "消息", tags: ["message"], icon: MessageSquare },
  { name: "Mail", label: "邮件", tags: ["mail"], icon: Mail },
  { name: "CalendarClock", label: "定时任务", tags: ["job", "schedule"], icon: CalendarClock },
  { name: "ScrollText", label: "日志", tags: ["log"], icon: ScrollText },
  { name: "FileText", label: "文档", tags: ["file", "doc"], icon: FileText },
  { name: "Archive", label: "归档", tags: ["archive"], icon: Archive },
  { name: "Upload", label: "上传", tags: ["upload"], icon: Upload },
  { name: "Database", label: "数据库", tags: ["data"], icon: Database },
  { name: "Server", label: "服务器", tags: ["server"], icon: Server },
  { name: "Monitor", label: "监控屏", tags: ["monitor"], icon: Monitor },
  { name: "Activity", label: "运行状态", tags: ["monitor", "activity"], icon: Activity },
  { name: "Gauge", label: "仪表", tags: ["monitor", "gauge"], icon: Gauge },
  { name: "CircleGauge", label: "性能", tags: ["performance"], icon: CircleGauge },
  { name: "HardDrive", label: "磁盘", tags: ["disk"], icon: HardDrive },
  { name: "Boxes", label: "资源", tags: ["resource"], icon: Boxes },
  { name: "Globe", label: "接口网络", tags: ["api", "web"], icon: Globe },
  { name: "Terminal", label: "终端", tags: ["shell"], icon: Terminal },
  { name: "Code2", label: "代码生成", tags: ["code", "gen"], icon: Code2 },
  { name: "Workflow", label: "流程", tags: ["workflow"], icon: Workflow },
  { name: "TableProperties", label: "表格", tags: ["table"], icon: TableProperties },
  { name: "ClipboardList", label: "清单", tags: ["task", "list"], icon: ClipboardList },
  { name: "ChartNoAxesColumn", label: "统计", tags: ["chart", "stats"], icon: ChartNoAxesColumn },
  { name: "BarChart3", label: "图表", tags: ["chart"], icon: BarChart3 },
  { name: "Radar", label: "雷达", tags: ["scan"], icon: Radar },
  { name: "ScanLine", label: "扫描", tags: ["scan"], icon: ScanLine },
  { name: "Search", label: "搜索", tags: ["search"], icon: Search },
  { name: "Tag", label: "标签", tags: ["tag"], icon: Tag },
  { name: "Zap", label: "快速", tags: ["quick"], icon: Zap },
];

function getIconOption(name?: string | null) {
  if (!name) return undefined;
  return ICON_OPTIONS.find((item) => item.name === name);
}

function matchesOption(option: IconOption, keyword: string) {
  const source = [option.name, option.label, ...option.tags].join(" ");
  return source.toLowerCase().includes(keyword);
}

export function LucideIconPicker({
  id,
  value,
  placeholder = "选择 Lucide 图标",
  disabled,
  className,
  onValueChange,
}: LucideIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const selected = getIconOption(value);
  const keywordValue = keyword.trim().toLowerCase();
  const customValue = keyword.trim();
  const hasExactMatch = ICON_OPTIONS.some((item) => item.name === customValue);
  const filtered = useMemo(() => {
    if (!keywordValue) return ICON_OPTIONS;
    return ICON_OPTIONS.filter((option) => matchesOption(option, keywordValue));
  }, [keywordValue]);
  const PreviewIcon = selected?.icon ?? Tag;

  function selectIcon(name: string) {
    onValueChange(name);
    setKeyword("");
    setOpen(false);
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-10 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-input bg-muted/25 px-3 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30",
              open && "border-ring ring-3 ring-ring/50",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <PreviewIcon className="size-3.5" />
              </span>
              {value ? (
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {selected?.label ?? value}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {value}
                  </span>
                </span>
              ) : (
                <span className="truncate text-muted-foreground">
                  {placeholder}
                </span>
              )}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索名称、中文或业务关键词"
                className="h-9 bg-muted/30 pr-3 pl-8"
              />
            </div>
          </div>
          <ScrollArea className="h-72">
            <div className="grid grid-cols-2 gap-1 p-2">
              {filtered.map((option) => {
                const Icon = option.icon;
                const active = option.name === value;
                return (
                  <button
                    key={option.name}
                    type="button"
                    onClick={() => selectIcon(option.name)}
                    className={cn(
                      "flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
                      active && "bg-primary/10 text-primary",
                    )}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background ring-1 ring-border">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {option.label}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {option.name}
                      </span>
                    </span>
                    {active && <Check className="size-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                没有匹配的内置图标
              </div>
            )}
          </ScrollArea>
          {customValue && !hasExactMatch && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-full justify-start font-mono"
                onClick={() => selectIcon(customValue)}
              >
                使用自定义名称：{customValue}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          disabled={disabled}
          aria-label="清空图标"
          onClick={() => onValueChange("")}
          className="size-10"
        >
          <X />
        </Button>
      )}
    </div>
  );
}
