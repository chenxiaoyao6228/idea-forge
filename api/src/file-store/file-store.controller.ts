import { GetUser } from "@/auth/decorators/get-user.decorator";
import { FileService } from "./file-store.service";
import { Controller, Post, Body, Delete, Get, Param, Query, Put } from "@nestjs/common";
import { User } from "@prisma/client";

@Controller("api/files")
export class FileController {
  constructor(private fileService: FileService) {}

  @Post("credentials")
  async getUploadCredentials(
    @GetUser() user: User,
    @Body() body: {
      fileName: string;
      ext: string;
    },
  ) {
    return this.fileService.generateUploadCredentials(user.id, {
      ...body,
    });
  }

  @Post("confirm")
  async confirmUpload(
    @GetUser() user: User,
    @Body() body: {
      key: string;
      size: number;
    },
  ) {
    return this.fileService.confirmUpload({
      userId: user.id,
      ...body,
    });
  }
}
