CREATE TABLE "UserSalahDayStat" (
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "onTime" INTEGER NOT NULL DEFAULT 0,
    "kaza" INTEGER NOT NULL DEFAULT 0,
    "missed" INTEGER NOT NULL DEFAULT 0,
    "pending" INTEGER NOT NULL DEFAULT 0,
    "iman" INTEGER NOT NULL DEFAULT 68,
    "missedPrayers" JSONB NOT NULL DEFAULT '[]',
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSalahDayStat_pkey" PRIMARY KEY ("userId","date")
);

CREATE INDEX "UserSalahDayStat_userId_date_idx" ON "UserSalahDayStat"("userId", "date");

ALTER TABLE "UserSalahDayStat" ADD CONSTRAINT "UserSalahDayStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
