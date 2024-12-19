import { CommonDocumentResponse } from "shared";

export interface DocumentTreeItem extends CommonDocumentResponse {
  children: DocumentTreeItem[];
}
