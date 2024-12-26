import { Controller, Post, Body, Put, Param, Headers, Req } from "@nestjs/common";
import { CosService } from "./upload.service";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { Request } from "express";

@Controller("api/upload")
export class UploadController {
  constructor(private cosService: CosService) {}

  @Post("credentials")
  async getUploadCredentials(@GetUser("id") userId: number, @Body() body: { fileType: string }) {
    return this.cosService.generateUploadCredentials(userId, body.fileType);
  }

  @Put("local/:fileName")
  async uploadLocal(@GetUser("id") userId: number, @Param("fileName") fileName: string, @Req() request: Request) {
    const buffer = request.body;

    if (!Buffer.isBuffer(buffer)) {
      throw new Error("Invalid file data");
    }

    return await this.cosService.saveLocalFile(buffer, fileName, userId);
  }
}
