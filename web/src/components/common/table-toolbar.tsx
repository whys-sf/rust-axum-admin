import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TableToolbarProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  children?: ReactNode;
  className?: string;
}

export function TableToolbar({
  keyword,
  onKeywordChange,
  onSearch,
  placeholder = "按名称搜索",
  children,
  className,
}: TableToolbarProps) {
  return (
    <form
      className={cn("mb-4 flex flex-wrap items-center gap-2", className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <Input
        placeholder={placeholder}
        value={keyword}
        className="max-w-xs"
        onChange={(event) => onKeywordChange(event.target.value)}
      />
      {children}
      <Button type="submit" variant="secondary">
        <Search className="mr-1 size-4" />
        搜索
      </Button>
    </form>
  );
}
