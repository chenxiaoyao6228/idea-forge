-- CreateTable
CREATE TABLE "Star" (
    "id" TEXT NOT NULL,
    "index" VARCHAR(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "docId" TEXT,
    "subspaceId" TEXT,

    CONSTRAINT "Star_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Star_userId_docId_key" ON "Star"("userId", "docId");

-- CreateIndex
CREATE UNIQUE INDEX "Star_userId_subspaceId_key" ON "Star"("userId", "subspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Star_docId_subspaceId_key" ON "Star"("docId", "subspaceId");

-- AddForeignKey
ALTER TABLE "Star" ADD CONSTRAINT "Star_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Star" ADD CONSTRAINT "Star_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Star" ADD CONSTRAINT "Star_subspaceId_fkey" FOREIGN KEY ("subspaceId") REFERENCES "Subspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
