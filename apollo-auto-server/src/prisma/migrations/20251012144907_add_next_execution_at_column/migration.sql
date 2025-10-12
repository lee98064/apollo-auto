/*
  Warnings:

  - Added the required column `nextExecutionAt` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME,
    "data" TEXT,
    "nextExecutionAt" DATETIME NOT NULL,
    "lastExecutedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("createdAt", "data", "endAt", "expiredAt", "id", "isActive", "lastExecutedAt", "startAt", "type", "updatedAt", "userId") SELECT "createdAt", "data", "endAt", "expiredAt", "id", "isActive", "lastExecutedAt", "startAt", "type", "updatedAt", "userId" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE INDEX "Job_userId_type_idx" ON "Job"("userId", "type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
