import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface DialogStatusSwitchProps {
  id: string;
  eyebrow: string;
  checked: boolean;
  checkedLabel: string;
  uncheckedLabel: string;
  onCheckedChange: (checked: boolean) => void;
}

export function DialogStatusSwitch({
  id,
  eyebrow,
  checked,
  checkedLabel,
  uncheckedLabel,
  onCheckedChange,
}: DialogStatusSwitchProps) {
  return (
    <div className="relative flex shrink-0 items-center gap-3 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
      <div>
        <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
          {eyebrow}
        </p>
        <Label
          htmlFor={id}
          className="mt-0.5 block cursor-pointer text-xs font-bold text-foreground"
        >
          {checked ? checkedLabel : uncheckedLabel}
        </Label>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="scale-110 data-checked:bg-primary data-unchecked:bg-muted-foreground/40 **:data-[slot=switch-thumb]:bg-primary-foreground"
      />
    </div>
  );
}
