import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { OssService } from "@/file-store/oss.service";
import { FilePathService } from "@/file-store/file-path.service";
import { FileContext } from "@/file-store/file-context.enum";
import { PrepareImportDto, StartImportDto, ImportJobData } from "./imports.dto";

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    @InjectQueue("imports") private readonly importQueue: Queue,
    private readonly prismaService: PrismaService,
    private readonly ossService: OssService,
    private readonly filePathService: FilePathService,
  ) {}

  async prepareImport(userId: string, dto: PrepareImportDto) {
    // 1. Generate file key using FilePathService (USER context for temp files)
    const fileKey = this.filePathService.generateFileKey({
      context: FileContext.USER,
      userId,
      fileName: dto.fileName,
    });

    // 2. Generate presigned URL
    const uploadResult = await this.ossService.generatePresignedUrl(fileKey, {
      contentType: dto.mimeType,
    });

    // 3. Create pending import record (for tracking)
    const importJobId = `import_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store metadata temporarily
    await this.prismaService.temporaryImport.create({
      data: {
        id: importJobId,
        fileKey,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        workspaceId: dto.workspaceId,
        subspaceId: dto.subspaceId,
        parentId: dto.parentId,
        title: dto.title,
        userId,
        status: "pending",
        expiresAt,
      },
    });

    this.logger.log(`Prepared import: ${importJobId} for user: ${userId}`);

    return {
      uploadUrl: uploadResult.url,
      fileKey,
      importJobId,
    };
  }

  async startImport(userId: string, dto: StartImportDto) {
    // 1. Fetch import metadata
    const importRecord = await this.prismaService.temporaryImport.findUnique({
      where: { id: dto.importJobId },
    });

    if (!importRecord) {
      throw new Error("Import job not found");
    }

    // 2. Verify file exists in OSS
    const exists = await this.ossService.checkFileExists(importRecord.fileKey);
    if (!exists) {
      throw new Error("File not uploaded to storage");
    }

    // 3. Queue background job
    const job = await this.importQueue.add("import-document", {
      importJobId: dto.importJobId,
      fileKey: importRecord.fileKey,
      fileName: importRecord.fileName,
      mimeType: importRecord.mimeType,
      workspaceId: importRecord.workspaceId,
      subspaceId: importRecord.subspaceId,
      parentId: importRecord.parentId ?? undefined,
      title: importRecord.title,
      userId,
    } as ImportJobData);

    // 4. Update status
    await this.prismaService.temporaryImport.update({
      where: { id: dto.importJobId },
      data: { status: "processing" },
    });

    this.logger.log(`Queued import job: ${job.id} for file: ${importRecord.fileName}`);

    return {
      jobId: job.id?.toString() || "",
      importJobId: dto.importJobId,
      message: "Import started",
    };
  }

  async getStatus(importJobId: string) {
    // 1. Try to fetch from TemporaryImport (if still in progress)
    const importRecord = await this.prismaService.temporaryImport.findUnique({
      where: { id: importJobId },
    });

    if (!importRecord) {
      // Import record deleted means it's completed or failed and cleaned up
      // Check BullMQ for job status
      const jobs = await this.importQueue.getJobs(["completed", "failed"]);
      const job = jobs.find((j) => (j.data as ImportJobData).importJobId === importJobId);

      if (!job) {
        throw new Error("Import job not found");
      }

      // Job completed
      if (job.returnvalue) {
        return {
          importJobId,
          status: "complete" as const,
          progress: 100,
          message: "Import complete!",
          docId: job.returnvalue.docId,
          title: job.returnvalue.title,
        };
      }

      // Job failed
      if (job.failedReason) {
        return {
          importJobId,
          status: "failed" as const,
          progress: 0,
          message: "Import failed",
          error: job.failedReason,
        };
      }

      // Shouldn't reach here, but handle edge case
      return {
        importJobId,
        status: "pending" as const,
        progress: 0,
        message: "Waiting to start...",
      };
    }

    // 2. Get active job from queue
    const jobs = await this.importQueue.getJobs(["active", "waiting", "delayed"]);
    const job = jobs.find((j) => (j.data as ImportJobData).importJobId === importJobId);

    if (!job) {
      // Job exists in DB but not in queue - might be stuck
      return {
        importJobId,
        status: importRecord.status as any,
        progress: 0,
        message: "Waiting to start...",
      };
    }

    // 3. Get job progress from BullMQ
    const jobState = await job.getState();
    const progressData = job.progress as any;

    if (progressData && typeof progressData === "object") {
      return {
        importJobId,
        status: progressData.status || "processing",
        progress: progressData.progress || 0,
        message: progressData.message || "Processing...",
      };
    }

    // Default response for pending jobs
    return {
      importJobId,
      status: jobState === "waiting" ? ("pending" as const) : (importRecord.status as any),
      progress: 0,
      message: "Waiting to start...",
    };
  }
}
