import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { OssService } from "@/file-store/oss.service";
import { FileCleanupService } from "@/file-store/file-cleanup.service";
import { DocumentService } from "@/document/document.service";
import { convertToTiptapJSON } from "@/_shared/utils/document-converter";
import { tiptapTransformer } from "@/collaboration/extensions/transformer";
import { ImportJobData } from "../imports.dto";
import * as Y from "yjs";

@Processor("imports")
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly ossService: OssService,
    private readonly fileCleanupService: FileCleanupService,
    private readonly documentService: DocumentService,
  ) {
    super();
  }

  async process(job: Job<ImportJobData>): Promise<{ docId: string; title: string }> {
    const { importJobId, fileKey, fileName, mimeType, workspaceId, subspaceId, parentId, title, userId } = job.data;

    this.logger.log(`Processing import: ${importJobId} - ${fileName}`);

    try {
      // Step 1: Download file from OSS
      await this.updateProgress(job, "downloading", 10, "Downloading file...");
      const fileBuffer = await this.ossService.getFile(fileKey);

      // Step 2: Convert to TipTap JSON
      await this.updateProgress(job, "converting", 30, "Converting document...");
      const tiptapJSON = await convertToTiptapJSON(fileBuffer, fileName, mimeType);

      // Step 3: TODO - Extract and upload images (for DOCX) - Phase 1.5
      await this.updateProgress(job, "processing_images", 50, "Processing images...");
      // For now, skip image extraction
      const processedJSON = tiptapJSON;

      // Step 4: Convert TipTap JSON to Yjs binary
      await this.updateProgress(job, "creating_document", 70, "Creating document...");
      const ydoc = tiptapTransformer.toYdoc(processedJSON, "default");
      const contentBinary = Y.encodeStateAsUpdate(ydoc);

      // Step 5: Create document in database using DocumentService
      // This ensures navigationTree is updated and permissions are set
      await this.updateProgress(job, "saving", 85, "Saving document...");
      const document = await this.documentService.create(userId, {
        title,
        workspaceId,
        subspaceId,
        parentId,
        content: JSON.stringify(processedJSON),
        contentBinary: Buffer.from(contentBinary),
        type: "NOTE",
        visibility: "PRIVATE",
      });

      // Step 6: Clean up temporary file
      await this.fileCleanupService.deleteFile(fileKey);

      // Step 7: Clean up temporary import record
      await this.prismaService.temporaryImport.delete({
        where: { id: importJobId },
      });

      // Step 8: Mark as complete
      await this.updateProgress(job, "complete", 100, "Import complete!");

      this.logger.log(`Import completed: ${importJobId} → Document: ${document.id}`);

      // Return result for BullMQ to store
      return {
        docId: document.id,
        title: document.title,
      };
    } catch (error: any) {
      this.logger.error(`Import failed: ${importJobId}`, error?.stack || error?.message || String(error));
      throw error; // Let BullMQ handle retry logic
    }
  }

  private async updateProgress(job: Job<ImportJobData>, status: string, progress: number, message: string) {
    // Update BullMQ job progress for polling
    await job.updateProgress({
      status,
      progress,
      message,
    });
  }
}
