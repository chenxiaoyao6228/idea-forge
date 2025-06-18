import {
  ExtendedPrismaClient,
  getExtendedPrismaClient,
} from "@/_shared/database/prisma/prisma.extension";

let testPrisma: ExtendedPrismaClient;

/*
 * https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing
 * https://www.prisma.io/docs/orm/prisma-client/testing/unit-testing
 */

export async function setupDatabase() {
  const testDatabaseUrl = process.env.DATABASE_URL;

  console.log("=========setting up test database=========", testDatabaseUrl);

  testPrisma = getExtendedPrismaClient({ url: testDatabaseUrl });
  await testPrisma.$connect();

  // Clear all tables before tests
  await clearDatabase();
}

export async function clearDatabase() {
  if (!testPrisma) return;
  // FIXME: temp solution
  // disconnect all connections, ensure no transactions
  await testPrisma.$disconnect();
  // reconnect
  await testPrisma.$connect();

  const tableNames = await testPrisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  console.log(
    "Clearing tables:",
    tableNames.map((t) => t.tablename).filter((t) => t !== "_prisma_migrations")
  );

  for (const { tablename } of tableNames) {
    if (tablename !== "_prisma_migrations") {
      await testPrisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${tablename}" CASCADE`
      );
    }
  }

  // Log row count for each table after clearing
  for (const { tablename } of tableNames) {
    if (tablename !== "_prisma_migrations") {
      const [{ count }] = await testPrisma.$queryRawUnsafe<{ count: string }[]>(
        `SELECT COUNT(*) as count FROM "${tablename}"`
      );
      console.log(`Table ${tablename} row count after clear:`, count);
    }
  }
}

export async function teardownDatabase() {
  if (testPrisma) {
    await testPrisma.$disconnect();
    console.log("=========disconnected from database=========");
  }
}

export function getTestPrisma() {
  return testPrisma;
}
