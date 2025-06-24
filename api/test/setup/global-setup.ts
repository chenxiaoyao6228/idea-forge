// import { beforeEach, beforeAll, afterAll, vi } from "vitest";
import {
  startContainersAndWriteEnv,
  stopContainers,
  clearDatabase,
} from "./test-container-setup";

// Start containers and write env synchronously before anything else
(async () => {
  await startContainersAndWriteEnv();
})();


afterAll(async () => {
  await stopContainers();
});

beforeEach(async () => {
  vi.clearAllMocks();
  await clearDatabase();
});