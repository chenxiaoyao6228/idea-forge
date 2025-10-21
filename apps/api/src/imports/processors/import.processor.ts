import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { OssService } from "@/file-store/oss.service";
import { FileCleanupService } from "@/file-store/file-cleanup.service";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
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
    private readonly eventPublisher: EventPublisherService,
  ) {
    super();
  }

  async process(job: Job<ImportJobData>): Promise<void> {
    const { importJobId, fileKey, fileName, mimeType, workspaceId, subspaceId, title, userId } = job.data;

    this.logger.log(`Processing import: ${importJobId} - ${fileName}`);

    try {
      // Step 1: Download file from OSS
      await this.publishProgress(job, "downloading", 10, "Downloading file...");
      const fileBuffer = await this.ossService.getFile(fileKey);

      // Step 2: Convert to TipTap JSON
      await this.publishProgress(job, "converting", 30, "Converting document...");
      const tiptapJSON = await convertToTiptapJSON(fileBuffer, fileName, mimeType);

      // Step 3: TODO - Extract and upload images (for DOCX) - Phase 1.5
      await this.publishProgress(job, "processing_images", 50, "Processing images...");
      // For now, skip image extraction
      const processedJSON = tiptapJSON;

      // Step 4: Convert TipTap JSON to Yjs binary
      await this.publishProgress(job, "creating_document", 70, "Creating document...");
      const ydoc = tiptapTransformer.toYdoc(processedJSON, "default");
      const contentBinary = Y.encodeStateAsUpdate(ydoc);

      // Step 5: Create document in database
      await this.publishProgress(job, "saving", 85, "Saving document...");
      const document = await this.prismaService.doc.create({
        data: {
          title,
          workspaceId,
          subspaceId,
          content: JSON.stringify(processedJSON),
          contentBinary: Buffer.from(contentBinary),
          createdById: userId,
          authorId: userId,
          lastModifiedById: userId,
          type: "NOTE",
          visibility: "PRIVATE",
        },
      });

      // Step 6: Clean up temporary file
      await this.fileCleanupService.cleanupImportTempFileByKey(fileKey);

      // Step 7: Clean up temporary import record
      await this.prismaService.temporaryImport.delete({
        where: { id: importJobId },
      });

      // Step 8: Publish completion event
      await this.publishProgress(job, "complete", 100, "Import complete!");
      await this.eventPublisher.publishWebsocketEvent({
        name: BusinessEvents.DOCUMENT_IMPORT_COMPLETE,
        workspaceId,
        actorId: userId,
        data: {
          importJobId,
          docId: document.id,
          title: document.title,
        },
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Import completed: ${importJobId} → Document: ${document.id}`);
    } catch (error: any) {
      this.logger.error(`Import failed: ${importJobId}`, error);

      // Publish error event
      await this.eventPublisher.publishWebsocketEvent({
        name: BusinessEvents.DOCUMENT_IMPORT_ERROR,
        workspaceId,
        actorId: userId,
        data: {
          importJobId,
          error: this.getErrorMessage(error),
        },
        timestamp: new Date().toISOString(),
      });

      throw error; // Let BullMQ handle retry logic
    }
  }

  private async publishProgress(job: Job<ImportJobData>, status: string, progress: number, message: string) {
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.DOCUMENT_IMPORT_PROGRESS,
      workspaceId: job.data.workspaceId,
      actorId: job.data.userId,
      data: {
        importJobId: job.data.importJobId,
        status,
        progress,
        message,
      },
      timestamp: new Date().toISOString(),
    });
  }

  private getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }
    return "An unexpected error occurred during import";
  }
}
