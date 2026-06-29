import { useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { DialogHeroHeader } from "@/components/common/dialog-hero-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TreeCheckbox } from "@/components/common/tree-checkbox";
import { toggleTreeSelection } from "@/lib/tree";
import type { MenuNode } from "@/lib/api/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AssignMenusDialogProps {
  roleName: string;
  menus: MenuNode[];
  selected: string[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (menuIds: string[]) => void;
}

function filterMenus(nodes: MenuNode[], keyword: string): MenuNode[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return nodes;

  return nodes.flatMap((node) => {
    const children = filterMenus(node.children ?? [], q);
    const matched = [node.name, node.perm, node.path, node.api_path]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));

    if (!matched && children.length === 0) return [];
    return [{ ...node, children }];
  });
}

export function AssignMenusDialog({
  roleName,
  menus,
  selected,
  saving,
  onCancel,
  onSubmit,
}: AssignMenusDialogProps) {
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(selected.map(String)),
  );
  const [searchText, setSearchText] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const filteredMenus = useMemo(
    () => filterMenus(menus, searchKeyword),
    [menus, searchKeyword],
  );

  function toggle(id: string) {
    setChecked((prev) => toggleTreeSelection(menus, prev, id));
  }

  function submitSearch(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSearchKeyword(searchText);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-lg dark:ring-white/10"
      >
        <DialogHeroHeader
          icon={ShieldCheck}
          eyebrow="权限分配"
          title="分配菜单权限"
          description={<>为角色「{roleName}」勾选可访问的菜单与按钮。</>}
          aside={
            <div className="relative shrink-0 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
              <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
                已选择
              </p>
              <p className="mt-0.5 text-xs font-bold text-foreground">
                {checked.size} 项
              </p>
            </div>
          }
        />
        <form
          onSubmit={submitSearch}
          className="mx-5 mt-6 flex items-center gap-2 sm:mx-7"
        >
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="搜索菜单或权限标识"
            className="h-9"
          />
          <Button type="submit" className="h-9 shrink-0 gap-1.5 px-3">
            <Search className="size-4" />
            搜索
          </Button>
        </form>
        <ScrollArea className="mx-5 mt-3 h-80 overflow-y-auto rounded-lg p-3 sm:mx-7">
          <TreeCheckbox
            nodes={filteredMenus}
            checked={checked}
            onToggle={toggle}
            linked
          />
          {menus.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无菜单</p>
          )}
          {menus.length > 0 && filteredMenus.length === 0 && (
            <p className="text-sm text-muted-foreground">未找到匹配菜单</p>
          )}
        </ScrollArea>

        <DialogFooter className="mx-0 mb-0 mt-auto flex-row items-center justify-end rounded-none px-5 py-4 sm:px-7">
          <Button variant="ghost" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={() => onSubmit([...checked])} disabled={saving}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
