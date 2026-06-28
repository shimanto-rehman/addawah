-- Query-performance indexes for friendship lookups, wakt reminders, and notification sync.

CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE INDEX IF NOT EXISTS "SalahRecord_userId_date_prayer_kind_completed_idx" ON "SalahRecord"("userId", "date", "prayer", "kind", "completed");

CREATE INDEX IF NOT EXISTS "Friendship_userId_status_idx" ON "Friendship"("userId", "status");
CREATE INDEX IF NOT EXISTS "Friendship_friendId_status_idx" ON "Friendship"("friendId", "status");

CREATE INDEX IF NOT EXISTS "Poke_toUserId_createdAt_idx" ON "Poke"("toUserId", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_type_readAt_idx" ON "Notification"("userId", "type", "readAt");

DROP INDEX IF EXISTS "Session_token_idx";
