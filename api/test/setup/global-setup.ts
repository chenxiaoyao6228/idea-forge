import { beforeEach, beforeAll, afterAll, vi } from "vitest";
import {
  startTestPostgres,
  stopTestPostgres,
  clearDatabase,
} from "./database-setup";
import { setupMocks } from "./mock-setup";

beforeAll(async () => {
  await startTestPostgres();
  await setupMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterAll(async () => {
  await stopTestPostgres();
});

beforeEach(async () => {
  console.log("=========clearing database=========");
  vi.clearAllMocks();
  await clearDatabase();
});
