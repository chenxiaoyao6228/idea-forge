import {
  ExtendedPrismaClient,
  getExtendedPrismaClient,
} from "@/_shared/database/prisma/prisma.extension";
import { afterAll, beforeAll, beforeEach } from "vitest";

let testPrisma: ExtendedPrismaClient;

async function setupDatabase() {
  testPrisma = getExtendedPrismaClient({ url: process.env.DATABASE_URL });

  await testPrisma.$connect();
}

async function teardownDatabase() {
  if (testPrisma) {
    await testPrisma.$disconnect();
  }
}

function getTestPrisma() {
  return testPrisma;
}

beforeAll(async () => {
  await setupDatabase();
});

afterAll(async () => {
  await teardownDatabase();
});

beforeEach(async () => {
  const prisma = getTestPrisma();
  await prisma.doc.deleteMany();
  await prisma.subspace.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
  // TODO: delete other tables
});
