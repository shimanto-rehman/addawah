-- Drop the redundant secondary index on DailyChallenge(userId, date).
-- @@unique([userId, date]) already creates a unique composite index on the
-- same column pair, so the separate @@index is a duplicate: extra storage
-- and extra write cost on every insert/update with no query benefit.
DROP INDEX IF EXISTS "DailyChallenge_userId_date_idx";
