/**
 * Canonical resolved location — the single shape persisted to the User row and
 * consumed by prayer-time lookups. The picker produces it; the profile PATCH
 * accepts it; `fetchPrayerTimes` reads it.
 *
 * `latitude`/`longitude`/`timeZone` are the source of truth for timings.
 * `city`/`country` are display-only labels (reverse-geocoded or dataset-derived).
 */
export type ResolvedLocation = {
  latitude: number;
  longitude: number;
  timeZone: string;
  city: string;
  country: string;
  countryCode: string;
};
