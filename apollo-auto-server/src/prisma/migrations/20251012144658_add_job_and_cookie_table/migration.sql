-- CreateTable
CREATE TABLE "ApolloCookie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApolloCookie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Job" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME,
    "data" TEXT,
    "lastExecutedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ApolloCookie_userId_key" ON "ApolloCookie"("userId");

-- CreateIndex
CREATE INDEX "ApolloCookie_userId_idx" ON "ApolloCookie"("userId");

-- CreateIndex
CREATE INDEX "Job_userId_type_idx" ON "Job"("userId", "type");
