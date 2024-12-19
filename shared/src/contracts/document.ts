import { Doc } from "./prisma";

export interface CommonDocument extends Doc {
  isLeaf: boolean;
}
export interface CreateDocumentResponse extends CommonDocument {}
