export interface DocumentItem {
  id: string;
  title: string;
  isStarred: boolean;
  parentId: string | null;
  hasChildren: boolean;
}

export interface DocumentTreeItem extends DocumentItem {
  children: DocumentTreeItem[];
}
