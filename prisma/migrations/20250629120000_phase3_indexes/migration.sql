-- Phase 3: Database Indexes for Production Scaling
-- See PRODUCTION_SCALING_PLAN.md for details

-- 3.1 Composite Index for Friendship Lookups
-- Speeds up friend request checks that query both directions with OR
CREATE INDEX IF NOT EXISTS "Friendship_userId_friendId_status_idx"
  ON "Friendship"("userId", "friendId", "status");

-- 3.2 Index for FARD-Only Queries
-- Analytics, insights, and friends hub all filter kind = 'FARD'
CREATE INDEX IF NOT EXISTS "SalahRecord_userId_kind_date_idx"
  ON "SalahRecord"("userId", "kind", "date");

-- 3.3 Trigram Index for Username Search
-- Enables efficient ILIKE '%query%' searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "User_username_trgm_idx"
  ON "User" USING gin ("username" gin_trgm_ops);

-- 3.4 Skipped: Partial index with NOW() is not immutable in PostgreSQL
-- The existing Session(expiresAt) index is sufficient
