import { CommonDocumentResponse } from "@idea/contracts";

export interface DocumentTreeItem extends CommonDocumentResponse {
  children: DocumentTreeItem[];
}
