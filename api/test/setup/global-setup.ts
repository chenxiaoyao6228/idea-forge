// import { beforeEach, beforeAll, afterAll, vi } from "vitest";
import {
  startContainersAndWriteEnv,
  stopContainers,
  clearDatabase,
} from "./test-container-setup";

await startContainersAndWriteEnv();


afterAll(async () => {
  await stopContainers();
});

beforeEach(async () => {
  vi.clearAllMocks();
  await clearDatabase();
});
