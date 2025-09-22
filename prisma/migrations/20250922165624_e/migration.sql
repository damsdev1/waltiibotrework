/*
  Warnings:

  - A unique constraint covering the columns `[platform,platformId,giveawayEntryId]` on the table `Connections` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Connections_platform_platformId_userId_giveawayEntryId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Connections_platform_platformId_giveawayEntryId_key" ON "Connections"("platform", "platformId", "giveawayEntryId");
