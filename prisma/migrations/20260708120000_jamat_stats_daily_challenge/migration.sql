-- Track count of fard prayers prayed in Jamat/Awal Wakt per day.
ALTER TABLE "UserSalahDayStat" ADD COLUMN "jamat" INTEGER NOT NULL DEFAULT 0;

-- Daily Muslim Challenge — 5 daily good deeds marked off by the user.
CREATE TABLE "DailyChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mask" INTEGER NOT NULL DEFAULT 0,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyChallenge_userId_date_key" ON "DailyChallenge"("userId", "date");
CREATE INDEX "DailyChallenge_userId_date_idx" ON "DailyChallenge"("userId", "date");

ALTER TABLE "DailyChallenge"
  ADD CONSTRAINT "DailyChallenge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
