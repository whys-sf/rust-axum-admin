import { Check, Laptop, Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { COLOR_PRESETS, useThemeStore, type Mode } from "@/stores/theme";

const MODES: { value: Mode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "亮色", icon: Sun },
  { value: "dark", label: "暗色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Laptop },
];

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const color = useThemeStore((s) => s.color);
  const setMode = useThemeStore((s) => s.setMode);
  const setColor = useThemeStore((s) => s.setColor);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="主题设置">
          <Palette className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>外观</DropdownMenuLabel>
        {MODES.map((m) => (
          <DropdownMenuItem key={m.value} onClick={() => setMode(m.value)}>
            <m.icon className="mr-2 size-4" />
            <span className="flex-1">{m.label}</span>
            {mode === m.value && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>主色</DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1 p-1">
          {COLOR_PRESETS.map((c) => (
            <Button
              variant={"ghost"}
              size="icon"
              onClick={() => setColor(c.value)}
            >
              <span
                className="inline-flex size-4 items-center justify-center rounded-full"
                style={{ backgroundColor: c.swatch }}
              >
                {color === c.value && <Check className="size-3 text-white" />}
              </span>
            </Button>
            // <button
            //   key={c.value}
            //   type="button"
            //   onClick={() => setColor(c.value)}
            //   aria-label={c.label}
            //   className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs hover:bg-accent"
            // >

            // </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
