-- CreateTable
CREATE TABLE "UserWorkspaceOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "index" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWorkspaceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserWorkspaceOrder_userId_index_idx" ON "UserWorkspaceOrder"("userId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "UserWorkspaceOrder_userId_workspaceId_key" ON "UserWorkspaceOrder"("userId", "workspaceId");

-- AddForeignKey
ALTER TABLE "UserWorkspaceOrder" ADD CONSTRAINT "UserWorkspaceOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWorkspaceOrder" ADD CONSTRAINT "UserWorkspaceOrder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
