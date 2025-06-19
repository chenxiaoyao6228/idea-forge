import { withTestTransaction } from "./test-transaction";

export function itTx(
  name: string,
  fn: (prisma: any) => Promise<any>,
  timeout?: number
) {
  it(
    name,
    async () => {
      await withTestTransaction(fn);
    },
    timeout
  );
}
