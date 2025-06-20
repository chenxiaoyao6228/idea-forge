import { UserService } from "./user.service";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { UserStatus } from "@prisma/client";

describe("UserService Integration - searchUser pagination", () => {
  let prisma: PrismaService;
  let service: UserService;
  const testUsers = Array.from({ length: 25 }).map((_, i) => ({
    email: `user${i}@test.com`,
    status: UserStatus.ACTIVE,
    displayName: `User ${i}`,
  }));

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new UserService(prisma);
  });

  beforeEach(async () => {
    // Clean up users
    await prisma.user.deleteMany({});
    // Seed users
    await prisma.user.createMany({ data: testUsers });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  it("returns correct pagination for page 1, limit 10", async () => {
    const result = await service.searchUser({ page: 1, limit: 10, sortBy: "createdAt", sortOrder: "asc" });
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.total).toBe(25);
    expect(result.data.length).toBe(10);
    expect(result.data[0].email).toBe("user1@test.com");
  });

  it("returns correct pagination for page 2, limit 10", async () => {
    const result = await service.searchUser({ page: 2, limit: 10, sortBy: "createdAt", sortOrder: "asc" });
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.total).toBe(25);
    expect(result.data.length).toBe(10);
    expect(result.data[0].email).toBe("user10@test.com");
  });

  it("returns correct pagination for last page", async () => {
    const result = await service.searchUser({ page: 3, limit: 10, sortBy: "createdAt", sortOrder: "asc" });
    expect(result.pagination.page).toBe(3);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.total).toBe(25);
    expect(result.data.length).toBe(5);
    expect(result.data[0].email).toBe("user20@test.com");
  });

  it("returns empty data for out-of-range page", async () => {
    const result = await service.searchUser({ page: 5, limit: 10, sortBy: "createdAt", sortOrder: "asc" });
    expect(result.pagination.page).toBe(5);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.total).toBe(25);
    expect(result.data.length).toBe(0);
  });
});
