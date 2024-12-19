import { CommonDocument } from "shared";

export interface DocumentItem extends CommonDocument {}

export interface DocumentTreeItem extends DocumentItem {
  children: DocumentTreeItem[];
}
