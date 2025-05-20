import { Inject, Injectable } from "@nestjs/common";
import { MoveDocumentsDto, SearchDocumentDto } from "./document.dto";
import { ContentMatch, SearchDocumentResponse } from "contracts";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";

@Injectable()
export class MoveDocumentService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {}
  async moveDocs(authorId: number, { id, targetId, dropPosition }: MoveDocumentsDto) {
    // TODO:
  }
}
