import { Controller, Post, Body } from "@nestjs/common";
import { CosService } from "./upload.service";
import { GetUser } from "@/auth/decorators/get-user.decorator";

@Controller("api/upload")
export class UploadController {
  constructor(private cosService: CosService) {}

  @Post("credentials")
  async getUploadCredentials(@GetUser("id") userId: number, @Body() body: { fileType: string }) {
    return this.cosService.generateUploadCredentials(userId, body.fileType);
  }
}
