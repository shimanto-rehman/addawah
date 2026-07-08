-- Add canonical location columns to "User".
-- latitude/longitude are GPS coords (source of truth for prayer times);
-- timeZone is the IANA name (e.g. "Asia/Dhaka") captured client-side.
-- city/country are kept as display labels but lose their defaults so that
-- missing location is detectable (fail-closed) instead of silently "Dhaka".
ALTER TABLE "User"
  ADD COLUMN "latitude"  DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "timeZone"  TEXT;

ALTER TABLE "User" ALTER COLUMN "country" DROP DEFAULT;
