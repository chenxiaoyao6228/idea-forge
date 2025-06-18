import { getTestPrisma } from "../setup/database-setup";

export async function withTestTransaction<T>(
  testFn: (prisma: any) => Promise<T>
): Promise<T> {
  const prisma = getTestPrisma();
  let result: T;
  return await prisma
    .$transaction(async (tx: any) => {
      result = await testFn(tx);
      //transaction will be rolled back, ensuring test data is not persisted
      throw new Error("ROLLBACK_TEST_TRANSACTION");
    })
    .catch((error: any) => {
      if (error.message === "ROLLBACK_TEST_TRANSACTION") {
        return result;
      }
      throw error;
    });
}
