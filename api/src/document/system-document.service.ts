import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SystemDocumentService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
    private configService: ConfigService,
  ) {}

  private readonly SYSTEM_EMAIL = this.configService.get("SUPER_ADMIN_EMAIL");
  // FIXME: temporary solution for user to collaborate with other user
  private readonly WELCOME_DOC_TITLE = "Have fun with idea forge";

  async shareWelcomeDocument(userId: number) {
    // Get system user
    const systemUser = await this.prisma.user.findUnique({
      where: { email: this.SYSTEM_EMAIL },
    });

    if (!systemUser) {
      throw new Error("System user not found");
    }

    // Get welcome document
    const welcomeDoc = await this.prisma.doc.findFirst({
      where: {
        title: this.WELCOME_DOC_TITLE,
        authorId: systemUser.id,
      },
    });

    if (!welcomeDoc) {
      throw new Error("Welcome document not found");
    }

    // Share document with new user
    await this.prisma.docShare.create({
      data: {
        docId: welcomeDoc.id,
        userId: userId,
        permission: "EDIT",
        authorId: systemUser.id,
      },
    });

    return welcomeDoc;
  }
}
