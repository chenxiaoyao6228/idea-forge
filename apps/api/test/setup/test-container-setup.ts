import {
  StartedPostgreSqlContainer,
  PostgreSqlContainer,
} from "@testcontainers/postgresql";
import { execSync } from "child_process";
import { unlinkSync, writeFileSync, existsSync } from "fs";

import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";
import { PrismaClient } from "@prisma/client";

let redisContainer: StartedRedisContainer | undefined;
let postgresContainer: StartedPostgreSqlContainer;
let testPrisma: PrismaClient;

/*
 * https://www.npmjs.com/package/testcontainers
 * https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing
 * https://www.prisma.io/docs/orm/prisma-client/testing/unit-testing
 */

export async function startContainersAndWriteEnv() {
  try {
    console.log("========== Starting test postgres container ==========");
    postgresContainer = await new PostgreSqlContainer("postgres:15")
      .withDatabase("ideaforge")
      .withUsername("postgres")
      .withPassword("123456")
      .start();
    const pgUrl = postgresContainer.getConnectionUri();
    console.log("========== Test postgres url ==========", pgUrl);
    testPrisma = new PrismaClient({ datasources: { db: { url: pgUrl } } });
    await testPrisma.$connect();

    redisContainer = await new RedisContainer("redis:7-alpine").withExposedPorts(7379).start();
    const redisHost = redisContainer.getHost();
    const redisPort = redisContainer.getMappedPort(7379);

    // Write to .env.testcontainers
    const envContent = `DATABASE_URL=${pgUrl}\nREDIS_HOST=${redisHost}\nREDIS_PORT=${redisPort}\n`;
    writeFileSync(process.cwd() + "/.env.testcontainers", envContent);

    // Also set process.env for current process
    process.env.DATABASE_URL = pgUrl;
    process.env.REDIS_HOST = redisHost;
    process.env.REDIS_PORT = String(redisPort);

    execSync(
      `npx prisma migrate deploy --schema=${process.cwd()}/prisma/schema.prisma`,
      {
        stdio: "inherit",
        env: {
          ...process.env,
          DATABASE_URL: pgUrl,
        },
      }
    );
  } catch (err) {
    console.error("Failed to start container:", err);
    throw err;
  }
}

export async function stopContainers() {
  if (testPrisma) await testPrisma.$disconnect();
  if (postgresContainer) await postgresContainer.stop();
  if (redisContainer) await redisContainer.stop();
  const envFilePath = process.cwd() + "/.env.testcontainers";
  if (existsSync(envFilePath)) {
    unlinkSync(envFilePath);
  }
}

export function getTestPrisma() {
  if (!testPrisma) {
    throw new Error("Test Prisma client not initialized. Make sure startContainersAndWriteEnv() is called.");
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

