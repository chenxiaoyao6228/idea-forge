-- CreateTable
CREATE TABLE "UserLoginHistory" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "ip" TEXT,
    "location" TEXT,
    "loginTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserLoginHistory_userId_idx" ON "UserLoginHistory"("userId");

-- AddForeignKey
ALTER TABLE "UserLoginHistory" ADD CONSTRAINT "UserLoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
