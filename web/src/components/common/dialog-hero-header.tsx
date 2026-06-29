import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface DialogHeroHeaderProps {
  icon: LucideIcon;
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  tone?: "primary" | "destructive";
  aside?: ReactNode;
}

const toneClasses = {
  primary: {
    header: "bg-primary text-primary-foreground",
    border: "border-primary-foreground/10",
    mutedText: "text-primary-foreground/80",
    description: "text-primary-foreground/75",
    title: "text-primary-foreground",
  },
  destructive: {
    header: "bg-destructive text-white",
    border: "border-white/10",
    mutedText: "text-white/80",
    description: "text-white/75",
    title: "text-white",
  },
};

export function DialogHeroHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  tone = "primary",
  aside,
}: DialogHeroHeaderProps) {
  const classes = toneClasses[tone];

  return (
    <DialogHeader
      className={cn(
        "control-grid relative overflow-hidden px-5 py-5 text-left sm:px-7 sm:py-6",
        classes.header,
      )}
    >
      <div
        className={cn(
          "absolute -top-14 -right-12 size-40 rounded-full border",
          classes.border,
        )}
      />
      <div
        className={cn(
          "absolute -top-6 -right-2 size-24 rounded-full border",
          classes.border,
        )}
      />
      <div className="relative flex items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <Icon className={cn("size-3.5", classes.mutedText)} />
            <span
              className={cn(
                "text-[10px] font-semibold tracking-[0.2em] uppercase",
                classes.mutedText,
              )}
            >
              {eyebrow}
            </span>
          </div>
          <DialogTitle
            className={cn(
              "mt-3 text-xl font-semibold tracking-tight sm:text-2xl",
              classes.title,
            )}
          >
            {title}
          </DialogTitle>
          <DialogDescription className={cn("mt-2", classes.description)}>
            {description}
          </DialogDescription>
        </div>
        {aside}
      </div>
    </DialogHeader>
  );
}
