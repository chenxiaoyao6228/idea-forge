import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SystemDocumentService {
  constructor(
    private readonly prismaService: PrismaService,
    private configService: ConfigService,
  ) {}

  private readonly SYSTEM_EMAIL = this.configService.get("SUPER_ADMIN_EMAIL");
  // FIXME: temporary solution for user to collaborate with other user
  private readonly WELCOME_DOC_TITLE = "Have fun with idea forge";

  async shareWelcomeDocument(userId: string) {
    // Get system user
    const systemUser = await this.prismaService.user.findUnique({
      where: { email: this.SYSTEM_EMAIL },
    });

    if (!systemUser) {
      throw new Error("System user not found");
    }

    // Get welcome document
    const welcomeDoc = await this.prismaService.doc.findFirst({
      where: {
        title: this.WELCOME_DOC_TITLE,
        authorId: systemUser.id,
      },
    });

    if (!welcomeDoc) {
      throw new Error("Welcome document not found");
    }

    // Share document with new user
    await this.prismaService.docShare.create({
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
