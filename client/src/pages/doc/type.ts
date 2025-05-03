import { CommonDocumentResponse } from "contracts";

export interface DocumentTreeItem extends CommonDocumentResponse {
  children: DocumentTreeItem[];
}
