-- CreateTable
CREATE TABLE "Config" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiry" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Connections" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "giveawayEntryId" INTEGER NOT NULL,
    CONSTRAINT "Connections_giveawayEntryId_fkey" FOREIGN KEY ("giveawayEntryId") REFERENCES "GiveawayEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Giveaway" (
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

-- CreateTable
CREATE TABLE "GiveawayWinner" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "giveawayId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "GiveawayWinner_giveawayId_fkey" FOREIGN KEY ("giveawayId") REFERENCES "Giveaway" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GiveawayEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "giveawayId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "chances" INTEGER NOT NULL DEFAULT 1,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GiveawayEntry_giveawayId_fkey" FOREIGN KEY ("giveawayId") REFERENCES "Giveaway" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Config_key_key" ON "Config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Connections_platform_platformId_giveawayEntryId_key" ON "Connections"("platform", "platformId", "giveawayEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "Giveaway_interactionId_key" ON "Giveaway"("interactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Giveaway_messageId_key" ON "Giveaway"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "GiveawayEntry_giveawayId_userId_key" ON "GiveawayEntry"("giveawayId", "userId");
