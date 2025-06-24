import { Test, TestingModule } from "@nestjs/testing";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { ConfigsModule } from "@/_shared/config/config.module";
import { UserService } from "./user.service";
import { UserStatus } from "@prisma/client";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { ClsModule } from "@/_shared/utils/cls.module";

// Integration test uses testcontainers for Postgres/Redis. Dynamic URLs are loaded from .env.testcontainers via config.module.ts
describe("UserService Integration - searchUser pagination", () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let service: UserService;
  const testUsers = Array.from({ length: 25 }).map((_, i) => ({
    email: `user${i}@test.com`,
    status: UserStatus.ACTIVE,
    displayName: `User ${i}`,
  }));

  beforeAll(async () => {
    console.log("beforeAll in user.service.int.test.ts");
    module = await Test.createTestingModule({
      imports: [ConfigsModule, PrismaModule, ClsModule],
      providers: [UserService],
    }).compile();
    prisma = module.get(PrismaService);
    service = module.get(UserService);
    await prisma.$connect();
  });

  beforeEach(async () => {
    // Clean up users
    await prisma.user.deleteMany({});
    // Seed users
    for (const user of testUsers) {
      await prisma.user.create({ data: user });
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await module.close();
  });

  it("returns correct pagination for page 1, limit 10", async () => {
    const { pagination, data } = await service.searchUser({ page: 1, limit: 10, sortBy: "createdAt", sortOrder: "asc" });
    expect(pagination.page).toBe(1);
    expect(pagination.limit).toBe(10);
    expect(pagination.total).toBe(25);
    expect(data.length).toBe(10);
    expect(data[0].email).toBe("user0@test.com");
  });

  it("returns correct pagination for page 2, limit 10", async () => {
    const { pagination, data } = await service.searchUser({ page: 2, limit: 10, sortBy: "createdAt", sortOrder: "asc" });
    expect(pagination.page).toBe(2);
    expect(pagination.limit).toBe(10);
    expect(pagination.total).toBe(25);
    expect(data.length).toBe(10);
    expect(data[0].email).toBe("user10@test.com");
  });

  it("returns correct pagination for last page", async () => {
    const { pagination, data } = await service.searchUser({ page: 3, limit: 10, sortBy: "createdAt", sortOrder: "asc" });
    expect(pagination.page).toBe(3);
    expect(pagination.limit).toBe(10);
    expect(pagination.total).toBe(25);
    expect(data.length).toBe(5);
    expect(data[0].email).toBe("user20@test.com");
  });

  it("returns empty data for out-of-range page", async () => {
    const { pagination, data } = await service.searchUser({ page: 5, limit: 10, sortBy: "createdAt", sortOrder: "asc" });
    expect(pagination.page).toBe(5);
    expect(pagination.limit).toBe(10);
    expect(pagination.total).toBe(25);
    expect(data.length).toBe(0);
  });
});
