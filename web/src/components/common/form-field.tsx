import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  icon: LucideIcon;
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
}

export function FormField({
  icon: Icon,
  label,
  htmlFor,
  required,
  children,
  className,
  labelClassName,
}: FormFieldProps) {
  return (
    <Field className={cn("gap-2", className)}>
      <FieldLabel
        htmlFor={htmlFor}
        className={cn(
          "flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground/80",
          labelClassName,
        )}
      >
        <Icon className="size-3.5 text-primary" />
        <span>
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-destructive">
              *
            </span>
          )}
        </span>
      </FieldLabel>
      {children}
    </Field>
  );
}
