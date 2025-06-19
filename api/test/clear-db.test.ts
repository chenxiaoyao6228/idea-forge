import {
  clearDatabase,
  getTestPrisma,
  startTestPostgres,
} from "./setup/database-setup";

describe("clearDatabase", () => {
  beforeAll(async () => {
    await startTestPostgres();
  });

  it("should remove all data from all tables", async () => {
    const prisma = getTestPrisma();

    // Insert a row into a table (e.g., user)
    await prisma.user.create({
      data: { id: "test", email: "test@example.com" },
    });

    // Confirm row exists
    let count = await prisma.user.count();
    expect(count).toBe(1);

    // Clear database
    await clearDatabase();

    // Confirm row is gone
    count = await prisma.user.count();
    expect(count).toBe(0);
  });
});
