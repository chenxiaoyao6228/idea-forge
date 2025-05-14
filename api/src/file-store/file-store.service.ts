import { BadRequestException, Injectable, NotFoundException, HttpStatus } from "@nestjs/common";
import { OssService } from "./oss.service";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { validImageExts } from "./constant";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { UploadCredentialsResponse } from "contracts";
import { type ErrorCodeEnum } from "@/_shared/constants/api-response-constant";

@Injectable()
export class FileService {
  constructor(
    private prisma: PrismaService,
    private ossService: OssService,
  ) {}

  async generateUploadCredentials(
    userId: number,
    params: {
      fileName: string;
      ext: string;
    },
  ) {
    // TODO: Permission check, quota check
    const { ext } = params;

    const mediaType = validImageExts.includes(ext) ? "image" : "others";

    const fileName = `${uuidv4()}.${ext}`;
    const fileKey = `uploads/u-${userId}/${mediaType}/${fileName}`;

    // TODO: Generate corresponding Content-Type based on file type
    const contentType = "image/png";
    // 3. Pre-create record
    const fileRecord = await this.prisma.file.create({
      data: {
        key: fileKey,
        status: "pending",
        contentType,
        userId: userId,
        size: 0,
      },
    });

    // 4. Generate upload credentials
    const credentials = await this.ossService.generatePresignedUrl(fileKey, {
      contentType,
    });

    return {
      credentials: credentials as UploadCredentialsResponse["credentials"],
      fileKey,
      downloadUrl: this.ossService.getFileUrl(fileKey),
      fileId: fileRecord.id,
    };
  }

  async confirmUpload(
    userId: number,
    params: {
      fileId: string;
      fileKey: string;
    },
  ) {
    // TODO: Verify if the file is actually uploaded
    const isExists = await this.ossService.checkFileExists(params.fileKey);

    if (!isExists) {
      throw new NotFoundException("File not found");
    }

    // 2. Update file record
    const file = await this.prisma.file.findFirstOrThrow({
      where: {
        key: params.fileKey,
        status: "pending",
      },
    });

    const updateFile = await this.prisma.file.update({
      where: { id: file.id },
      data: {
        status: "active",
        url: this.ossService.getFileUrl(params.fileKey),
      },
    });

    return {
      fileId: updateFile.id,
      fileKey: updateFile.key,
      downloadUrl: this.ossService.getFileUrl(params.fileKey),
    };
  }

  async uploadFile(params: {
    userId: number;
    file: Express.Multer.File;
  }) {
    const { file, userId } = params;
    const ext = file.mimetype.split("/")[1];
    const fileName = `${uuidv4()}.${ext}`;
    const fileKey = `uploads/u-${userId}/image/${fileName}`;

    try {
      // 1. Upload directly to OSS
      await this.ossService.uploadFile(fileKey, file.buffer, {
        contentType: file.mimetype,
      });

      // 2. Create file record
      await this.prisma.file.create({
        data: {
          key: fileKey,
          status: "active",
          contentType: file.mimetype,
          userId: userId,
          size: file.size,
          url: this.ossService.getFileUrl(fileKey),
        },
      });

      return {
        downloadUrl: this.ossService.getFileUrl(fileKey),
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new ApiException(ErrorCodeEnum.FileUploadFailed);
    }
  }

  async deleteFile(params: {
    userId: number;
    fileId: string;
  }) {
    // Verify file ownership
    const file = await this.prisma.file.findFirst({
      where: {
        id: params.fileId,
        userId: params.userId,
      },
    });

    if (!file) {
      throw new ApiException(ErrorCodeEnum.FileNotFound, HttpStatus.NOT_FOUND);
    }

    // Delete from storage (OSS)
    await this.ossService.deleteFile(file.key);

    // Delete from database
    return this.prisma.file.delete({
      where: { id: params.fileId },
    });
  }

  async getFile(params: {
    userId: number;
    fileId: string;
  }) {
    const file = await this.prisma.file.findFirst({
      where: {
        id: params.fileId,
        userId: params.userId,
      },
    });

    if (!file) {
      throw new ApiException(ErrorCodeEnum.FileNotFound);
    }

    return file;
  }

  async proxyImage(userId: number, imageUrl: string) {
    try {
      // 1. Download original image
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new ApiException(ErrorCodeEnum.FileOperationFailed);
      }

      const contentType = response.headers.get("content-type");
      const extension = contentType?.split("/")[1] || "jpg";
      const filename = `proxy-image-${uuidv4()}.${extension}`;

      // 2. Get file content
      const buffer = Buffer.from(await response.arrayBuffer());

      const file = {
        buffer,
        originalname: filename,
        mimetype: contentType || "image/jpeg",
        size: buffer.length,
      } as Express.Multer.File;

      // 3. Upload to file storage
      const uploadResult = await this.uploadFile({
        userId,
        file,
      });

      return uploadResult;
    } catch (error) {
      console.error("Error proxying image:", error);
      throw new ApiException(ErrorCodeEnum.FileOperationFailed);
    }
  }
}
