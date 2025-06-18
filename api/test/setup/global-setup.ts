import { beforeEach, beforeAll, afterAll, vi } from "vitest";
import {
  setupDatabase,
  teardownDatabase,
  clearDatabase,
} from "./database-setup";
import { setupMocks } from "./mock-setup";

beforeAll(async () => {
  await setupDatabase();
  await setupMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterAll(async () => {
  await clearDatabase();
  await teardownDatabase();
});

beforeEach(async () => {
  console.log("=========clearing database=========");
  vi.clearAllMocks();
  await clearDatabase();
});
