-- CreateTable
CREATE TABLE "CalendarTaskCompletion" (
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mask" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarTaskCompletion_pkey" PRIMARY KEY ("userId", "date")
);

-- CreateIndex
CREATE INDEX "CalendarTaskCompletion_userId_date_idx" ON "CalendarTaskCompletion"("userId", "date");

-- AddForeignKey
ALTER TABLE "CalendarTaskCompletion" ADD CONSTRAINT "CalendarTaskCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
