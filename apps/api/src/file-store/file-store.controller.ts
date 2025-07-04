import { GetUser } from "@/auth/decorators/get-user.decorator";
import { FileService } from "./file-store.service";
import { Controller, Post, Body } from "@nestjs/common";
import { User } from "@idea/contracts";
import { UploadCredentialsDto, ConfirmUploadDto, ProxyImageDto } from "./file.dto";
import { ConfirmUploadResponse, ProxyImageResponse } from "@idea/contracts";
import { UploadCredentialsResponse } from "@idea/contracts";

@Controller("api/files")
export class FileController {
  constructor(private fileService: FileService) {}

  @Post("credentials")
  async getUploadCredentials(@GetUser() user: User, @Body() body: UploadCredentialsDto): Promise<UploadCredentialsResponse> {
    return this.fileService.generateUploadCredentials(user.id, body);
  }

  @Post("confirm")
  async confirmUpload(@GetUser() user: User, @Body() body: ConfirmUploadDto): Promise<ConfirmUploadResponse> {
    return this.fileService.confirmUpload(user.id, body);
  }

  @Post("proxy-image")
  async proxyImage(@GetUser() user: User, @Body() body: ProxyImageDto): Promise<ProxyImageResponse> {
    return this.fileService.proxyImage(user.id, body.imageUrl);
  }
}
