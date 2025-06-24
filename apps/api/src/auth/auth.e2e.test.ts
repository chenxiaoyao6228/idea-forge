import { E2ETestBuilder } from "@test/helpers/create-e2e-app";
import { AuthModule } from "@/auth/auth.module";
import { getTestPrisma } from "@test/setup/test-container-setup";
import { RealtimeGateway } from "@/_shared/socket/events/realtime.gateway";
import { AppModule } from "@/app.module";
import { MailService } from "@/_shared/email/mail.service";

// how to run : pnpm vitest --watch src/auth/auth.e2e.test.ts
describe("AuthController (e2e)", () => {
  let ctx: any;
  let prisma: any;

  const mockMailService = {
    sendMail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
    sendRegistrationEmail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
    sendPasswordResetEmail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
  };

  beforeAll(async () => {
    ctx = await new E2ETestBuilder()
      .withModule(AppModule)
      .withProvider({
        provide: MailService,
        useValue: mockMailService,
      })
      .compile();
    prisma = getTestPrisma();
  });

  afterAll(async () => {
    if (ctx) await ctx.close();
  });

  it("should register a new user", async () => {
    const res = await ctx.request().post("/api/auth/register").send({
      email: "e2euser@example.com",
      password: "e2epassword",
    });

    // TODO:
    // expect(res.status).toBe(200);
    // expect(res.body).toHaveProperty("id");
    // expect(res.body.email).toBe("e2euser@example.com");
  });

  it("should login with correct credentials", async () => {
    // TODO:
  });
});
