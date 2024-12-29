import { Injectable, NotFoundException } from "@nestjs/common";
import { OssService } from "./oss.service";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { validImageExts } from "./constant";

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
    // TODO:  权限检查, 配额检查
    const { ext } = params;

    const mediaType = validImageExts.includes(ext) ? "image" : "others";

    const fileName = `${uuidv4()}.${ext}`;
    const key = `uploads/u-${userId}/${mediaType}/${fileName}`;

    // TODO: 根据文件类型生成对应的 Content-Type
    const contentType = "image/png";

    // 3. 预创建记录
    const fileRecord = await this.prisma.file.create({
      data: {
        key,
        status: "pending",
        contentType,
        userId: userId,
        size: 0,
      },
    });

    // 4. 生成上传凭证
    const credentials = await this.ossService.generatePresignedUrl(key, {
      contentType,
    });

    return {
      credentials,
      key,
    };
  }

  async confirmUpload(params: {
    key: string;
    size: number;
    userId: number;
  }) {
    // TODO:  验证文件是否真实上传
    const isExists = await this.ossService.checkFileExists(params.key);

    if (!isExists) {
      throw new NotFoundException("File not found");
    }

    // 2. 更新文件记录
    const file = await this.prisma.file.findFirstOrThrow({
      where: {
        key: params.key,
        status: "pending",
      },
    });

    return this.prisma.file.update({
      where: { id: file.id },
      data: {
        status: "active",
        url: this.ossService.getFileUrl(params.key),
      },
    });
  }
}
