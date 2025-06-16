import { beforeEach, vi } from "vitest";

vi.mock("@prisma/client", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    UserStatus: actual.UserStatus as any,
    PrismaClient: vi.fn().mockImplementation(() => ({
      $extends: vi.fn().mockReturnThis(),
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      doc: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    })),
  };
});

// Mock Redis
vi.mock("redis", () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  })),
}));

// Mock AWS S3
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

// Mock Bull Queue
// vi.mock("bull", () => ({
//   default: vi.fn().mockImplementation(() => ({
//     add: vi.fn(),
//     process: vi.fn(),
//     close: vi.fn(),
//   })),
// }));

beforeEach(() => {
  vi.clearAllMocks();
});
