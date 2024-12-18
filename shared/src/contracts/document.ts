import { Doc } from "./prisma";

export interface CreateDocumentResponse extends Doc {
  isLeaf: boolean;
}
