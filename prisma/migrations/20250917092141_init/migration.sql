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
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    CONSTRAINT "Connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Giveaway" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "interactionId" TEXT NOT NULL,
    "channelId" TEXT,
    "messageId" TEXT,
    "prize" TEXT NOT NULL,
    "endTime" DATETIME NOT NULL,
    "ended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "subOnly" BOOLEAN NOT NULL DEFAULT false,
    "winnerUserId" TEXT
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
CREATE UNIQUE INDEX "Connections_platform_platformId_key" ON "Connections"("platform", "platformId");

-- CreateIndex
CREATE UNIQUE INDEX "Giveaway_interactionId_key" ON "Giveaway"("interactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Giveaway_messageId_key" ON "Giveaway"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "GiveawayEntry_giveawayId_userId_key" ON "GiveawayEntry"("giveawayId", "userId");
