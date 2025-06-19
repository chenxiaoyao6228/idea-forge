import {
  StartedPostgreSqlContainer,
  PostgreSqlContainer,
} from "@testcontainers/postgresql";
import { execSync } from "child_process";
import {
  ExtendedPrismaClient,
  getExtendedPrismaClient,
} from "@/_shared/database/prisma/prisma.extension";
import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";

let redisContainer: StartedRedisContainer | undefined;
let container: StartedPostgreSqlContainer;
let testPrisma: ExtendedPrismaClient;

/*
 * https://www.npmjs.com/package/testcontainers
 * https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing
 * https://www.prisma.io/docs/orm/prisma-client/testing/unit-testing
 */

export async function startTestPostgres() {
  container = await new PostgreSqlContainer("postgres:15")
    .withDatabase("testdb")
    .withUsername("testuser")
    .withPassword("testpass")
    .start();

  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;
  execSync(`DATABASE_URL='${url}' pnpm prisma migrate deploy`, {
    stdio: "inherit",
  });
  testPrisma = getExtendedPrismaClient({ url });
  await testPrisma.$connect();
  return url;
}

export async function stopTestPostgres() {
  if (testPrisma) await testPrisma.$disconnect();
  if (container) await container.stop();
}

export function getTestPrisma() {
  if (!testPrisma) {
    testPrisma = getExtendedPrismaClient({ url: process.env.DATABASE_URL });
  }
  return testPrisma;
}

export async function clearDatabase() {
  if (!testPrisma) return;
  const tableNames = await testPrisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;
  const tables = tableNames
    .map((t) => `"${t.tablename}"`)
    .filter((t) => t !== '"_prisma_migrations"')
    .join(", ");
  if (tables)
    await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
}

// ================== Redis ==================

export async function startTestRedis() {
  redisContainer = await new RedisContainer("redis:7-alpine").start();
  const host = redisContainer.getHost();
  const port = redisContainer.getMappedPort(6379);

  // Set env vars for your app to pick up
  process.env.REDIS_HOST = host;
  process.env.REDIS_PORT = port.toString();

  return { host, port };
}

export async function stopTestRedis() {
  if (container) await container.stop();
}
