export interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  children: TreeNode[];
}

// Builds a nested tree from git's flat "a/b/c.ts" path list (always
// forward-slash separated, regardless of host OS).
export function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: "", path: "", isFile: false, children: [] };
  for (const p of paths) {
    const parts = p.split("/").filter(Boolean);
    let cur = root;
    let acc = "";
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      const isFile = i === parts.length - 1;
      let child = cur.children.find((c) => c.name === part && c.isFile === isFile);
      if (!child) {
        child = { name: part, path: acc, isFile, children: [] };
        cur.children.push(child);
      }
      cur = child;
    });
  }
  sortTree(root);
  return root;
}

function sortTree(node: TreeNode) {
  node.children.sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  node.children.forEach(sortTree);
}

export function countEntries(node: TreeNode): { files: number; folders: number } {
  let files = 0;
  let folders = 0;
  const walk = (n: TreeNode) => {
    for (const c of n.children) {
      if (c.isFile) files++;
      else {
        folders++;
        walk(c);
      }
    }
  };
  walk(node);
  return { files, folders };
}

// Paths (folder + file) of every node that either matches `query` itself or
// has a descendant that does — used to auto-expand+show only relevant
// branches while filtering.
export function collectMatchPaths(node: TreeNode, query: string): Set<string> {
  const q = query.toLowerCase();
  const keep = new Set<string>();
  const visit = (n: TreeNode): boolean => {
    let selfMatch = n.name.toLowerCase().includes(q);
    let childMatch = false;
    for (const c of n.children) {
      if (visit(c)) childMatch = true;
    }
    if (selfMatch || childMatch) {
      keep.add(n.path);
      return true;
    }
    return false;
  };
  for (const c of node.children) visit(c);
  return keep;
}
