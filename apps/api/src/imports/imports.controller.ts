import { Body, Controller, Post, Logger } from "@nestjs/common";
import { ImportsService } from "./imports.service";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { PrepareImportDto, StartImportDto } from "./imports.dto";

@Controller("api/imports")
export class ImportsController {
  private readonly logger = new Logger(ImportsController.name);

  constructor(private readonly importsService: ImportsService) {}

  /**
   * Step 1: Prepare import - Generate presigned URL
   * POST /api/imports/prepare
   */
  @Post("prepare")
  async prepareImport(@GetUser("id") userId: string, @Body() dto: PrepareImportDto) {
    this.logger.log(`Preparing import: ${dto.title} (${dto.fileName})`);

    // TODO: Check admin permission
    // TODO: Validate workspace/subspace access

    return this.importsService.prepareImport(userId, dto);
  }

  /**
   * Step 2: Start import - Queue background job
   * POST /api/imports/start
   */
  @Post("start")
  async startImport(@GetUser("id") userId: string, @Body() dto: StartImportDto) {
    this.logger.log(`Starting import job: ${dto.importJobId}`);

    return this.importsService.startImport(userId, dto);
  }
}
