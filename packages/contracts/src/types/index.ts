export enum NavigationNodeType {
  Subspace = "subspace",
  Document = "document",
}

export type NavigationNode = {
  id: string;
  type?: NavigationNodeType;
  title: string;
  url: string;
  icon?: string;
  color?: string;
  children: NavigationNode[];
  subspaceId?: string | null;
  parentId?: string | null;
  parent?: NavigationNode | null;
  depth?: number;
};
