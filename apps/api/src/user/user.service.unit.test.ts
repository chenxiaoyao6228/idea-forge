import { TestBed } from "@suites/unit";
import { UserService } from "./user.service";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import type { Mocked } from "@suites/doubles.vitest";
import { UserStatus } from "@idea/contracts";

describe("UserService with @suites", () => {
  let service: UserService;
  let prisma: Mocked<PrismaService>;

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(UserService).compile();

    service = unit;
    prisma = unitRef.get(PrismaService) as unknown as Mocked<PrismaService>;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should have mocked prisma service", () => {
    expect(prisma).toBeDefined();
    expect(prisma.user.findUnique).toBeDefined();
  });

  // Example test case
  it("getUserById should call prisma.user.findUnique with the correct id", async () => {
    const userId = "some-user-id";
    const mockUser = {
      id: userId,
      email: "test@example.com",
      displayName: "Test User",
      imageUrl: null,
      emailVerified: null,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      hashedRefreshToken: null,
      currentWorkspaceId: null,
    };

    // Setup the mock implementation
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.getUserById(userId);

    // Verify the mock was called correctly
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
    });

    // Verify the result
    expect(result).toEqual(mockUser);
  });
});
