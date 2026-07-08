-- Add gender enum (optional on User; self-declared at registration/profile).
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');
ALTER TABLE "User" ADD COLUMN "gender" "Gender";

-- Add inJamat flag to SalahRecord.
-- Single column covers both gendered cases:
--   male   → "prayed in Jamat" (congregation)
--   female → "prayed in Awal Wakt" (start of the prayer window)
-- Existing rows default to false (no jamat/awal recorded).
ALTER TABLE "SalahRecord" ADD COLUMN "inJamat" BOOLEAN NOT NULL DEFAULT false;
