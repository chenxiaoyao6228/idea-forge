export interface DocumentItem {
  id: string;
  title: string;
  isStarred: boolean;
  parentId: string | null;
  isLeaf: boolean;
}

export interface DocumentTreeItem extends DocumentItem {
  children: DocumentTreeItem[];
}
