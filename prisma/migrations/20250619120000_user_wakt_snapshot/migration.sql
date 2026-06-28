-- Precomputed wakt status for fast friend board reads at scale.

CREATE TABLE "UserWaktSnapshot" (
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "prayer" "Prayer",
    "phase" TEXT NOT NULL,
    "salahStatus" TEXT NOT NULL,
    "prayerLabel" TEXT NOT NULL DEFAULT '—',
    "canPoke" BOOLEAN NOT NULL DEFAULT false,
    "forbiddenNow" BOOLEAN NOT NULL DEFAULT false,
    "remainingSeconds" INTEGER NOT NULL DEFAULT 0,
    "elapsedSeconds" INTEGER NOT NULL DEFAULT 0,
    "waktStartedAt" TIMESTAMP(3),
    "waktEndsAt" TIMESTAMP(3),
    "waktEndLabel" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWaktSnapshot_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "UserWaktSnapshot_dateKey_phase_idx" ON "UserWaktSnapshot"("dateKey", "phase");
CREATE INDEX "UserWaktSnapshot_refreshedAt_idx" ON "UserWaktSnapshot"("refreshedAt");

ALTER TABLE "UserWaktSnapshot" ADD CONSTRAINT "UserWaktSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
