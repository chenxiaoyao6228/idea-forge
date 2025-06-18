import { vi } from "vitest";

export async function setupMocks() {
  // Mock Redis
  vi.mock("redis", () => ({
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
      disconnect: vi.fn().mockResolvedValue(undefined),
      pipeline: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      }),
    })),
  }));

  // Mock AWS S3
  vi.mock("@aws-sdk/client-s3", () => ({
    S3Client: vi.fn().mockImplementation(() => ({
      send: vi.fn().mockResolvedValue({}),
    })),
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
  }));

  // Mock Bull Queue
  vi.mock("bull", () => {
    const MockQueue = vi.fn().mockImplementation(() => ({
      add: vi.fn().mockResolvedValue({}),
      process: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      getDelayedCount: vi.fn().mockResolvedValue(0),
    }));

    return {
      default: MockQueue,
      Queue: MockQueue,
    };
  });

  // Mock email service
  vi.mock("nodemailer", () => ({
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
    }),
  }));
}
