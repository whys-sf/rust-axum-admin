export interface TreeLike {
  id: string
  name: string
  children?: TreeLike[]
}

export interface FlatOption {
  id: string
  name: string
  depth: number
}

/** Flatten a forest into depth-tagged options for `<select>`-style pickers. */
export function flattenTree<T extends TreeLike>(
  nodes: T[],
  depth = 0,
  acc: FlatOption[] = [],
): FlatOption[] {
  for (const node of nodes) {
    acc.push({ id: node.id, name: node.name, depth })
    if (node.children?.length) {
      flattenTree(node.children as T[], depth + 1, acc)
    }
  }
  return acc
}

/** All ids in a subtree, including the node itself. */
function subtreeIds<T extends TreeLike>(node: T, acc: string[] = []): string[] {
  acc.push(node.id)
  for (const child of node.children ?? []) subtreeIds(child as T, acc)
  return acc
}

function indexTree<T extends TreeLike>(
  nodes: T[],
  parent: string | null,
  nodeMap: Map<string, T>,
  parentMap: Map<string, string>,
): void {
  for (const node of nodes) {
    nodeMap.set(node.id, node)
    if (parent) parentMap.set(node.id, parent)
    indexTree((node.children ?? []) as T[], node.id, nodeMap, parentMap)
  }
}

/**
 * Toggle a node with parent/child linkage:
 * - checking cascades to every descendant and marks all ancestors (so the menu
 *   path stays reachable);
 * - unchecking clears the whole subtree, then prunes ancestors that no longer
 *   have any checked child.
 */
export function toggleTreeSelection<T extends TreeLike>(
  nodes: T[],
  checked: Set<string>,
  id: string,
): Set<string> {
  const nodeMap = new Map<string, T>()
  const parentMap = new Map<string, string>()
  indexTree(nodes, null, nodeMap, parentMap)

  const target = nodeMap.get(id)
  if (!target) return checked
  const next = new Set(checked)

  if (next.has(id)) {
    for (const sid of subtreeIds(target)) next.delete(sid)
    let parent = parentMap.get(id)
    while (parent) {
      const node = nodeMap.get(parent)
      const stillChecked = (node?.children ?? []).some((c) => next.has(c.id))
      if (!stillChecked) next.delete(parent)
      parent = parentMap.get(parent)
    }
  } else {
    for (const sid of subtreeIds(target)) next.add(sid)
    let parent = parentMap.get(id)
    while (parent) {
      next.add(parent)
      parent = parentMap.get(parent)
    }
  }
  return next
}

export type CheckState = "checked" | "indeterminate" | false

/** Visual state of a node: fully checked, partially (indeterminate), or off. */
export function treeNodeState<T extends TreeLike>(
  node: T,
  checked: Set<string>,
): CheckState {
  const children = (node.children ?? []) as T[]
  const selfChecked = checked.has(node.id)
  if (children.length === 0) return selfChecked ? "checked" : false

  const childStates = children.map((c) => treeNodeState(c, checked))
  const allChildrenChecked = childStates.every((s) => s === "checked")
  const anySelected = selfChecked || childStates.some((s) => s !== false)

  if (selfChecked && allChildrenChecked) return "checked"
  if (anySelected) return "indeterminate"
  return false
}
