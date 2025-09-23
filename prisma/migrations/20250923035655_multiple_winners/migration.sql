/*
  Warnings:

  - You are about to drop the column `winnerUserId` on the `Giveaway` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Giveaway" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "interactionId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "prize" TEXT NOT NULL,
    "endTime" DATETIME NOT NULL,
    "ended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "subOnly" BOOLEAN NOT NULL DEFAULT false,
    "winnerCount" INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "new_Giveaway" ("channelId", "createdAt", "endTime", "ended", "id", "interactionId", "messageId", "prize", "subOnly", "updatedAt") SELECT "channelId", "createdAt", "endTime", "ended", "id", "interactionId", "messageId", "prize", "subOnly", "updatedAt" FROM "Giveaway";
DROP TABLE "Giveaway";
ALTER TABLE "new_Giveaway" RENAME TO "Giveaway";
CREATE UNIQUE INDEX "Giveaway_interactionId_key" ON "Giveaway"("interactionId");
CREATE UNIQUE INDEX "Giveaway_messageId_key" ON "Giveaway"("messageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
