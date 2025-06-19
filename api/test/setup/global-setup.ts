import { beforeEach, beforeAll, afterAll, vi } from "vitest";
import {
  startTestPostgres,
  stopTestPostgres,
  clearDatabase,
  startTestRedis,
  stopTestRedis,
} from "./test-container-setup";

beforeAll(async () => {
  await startTestRedis();
  await startTestPostgres();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterAll(async () => {
  await stopTestRedis();
  await stopTestPostgres();
});

beforeEach(async () => {

  vi.clearAllMocks();
  await clearDatabase();
});
