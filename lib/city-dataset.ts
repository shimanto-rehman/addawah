/**
 * Static city dataset for the location picker — a curated slice of GeoNames
 * `cities15000` (top ~10k by population, 276 countries), shipped as a compact
 * JSON array at /public/data/cities.json. Each row is:
 *
 *   [name, asciiname, latitude, longitude, countryCode, timeZone]
 *
 * The picker lazy-loads this once per session and filters client-side; no
 * network round-trip per keystroke. Coords + IANA timezone come straight from
 * the dataset so a picked city is immediately usable for prayer-time lookups
 * without a separate geocoding call.
 */

// Use Intl.DisplayNames for complete ISO-3166 coverage (the dial-code list in
// phone-countries.ts only covers ~77 entries). Built once, falls back to the
// raw ISO code if the runtime doesn't support region display names.
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
function countryNameFromIso(iso: string): string {
  try {
    return countryNames.of(iso) ?? iso;
  } catch {
    return iso;
  }
}

export type City = {
  id: string; // `${asciiname}, ${cc}` — stable React key
  name: string;
  asciiName: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  countryName: string;
  timeZone: string;
};

type RawCity = [string, string, number, number, string, string];

let cache: Promise<City[]> | null = null;

/** Lazy-load + shape the dataset. Memoised for the session. */
export function loadCities(): Promise<City[]> {
  if (!cache) {
    cache = fetch('/data/cities.json', { cache: 'force-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`cities.json ${r.status}`);
        return r.json() as Promise<RawCity[]>;
      })
      .then((rows) =>
        rows.map((row, i) => {
          const [name, asciiName, latitude, longitude, countryCode, timeZone] = row;
          return {
            id: `${asciiName.toLowerCase()},${countryCode.toLowerCase()},${i}`,
            name,
            asciiName,
            latitude,
            longitude,
            countryCode,
            countryName: countryNameFromIso(countryCode),
            timeZone,
          } satisfies City;
        }),
      )
      .catch((err) => {
        cache = null; // allow retry on next mount
        throw err;
      });
  }
  return cache;
}

const DEBOUNCE_MS = 120;

/**
 * Substring match against both the localised name and the ASCII name, with a
 * mild preference for matches at the start of the name. Case-insensitive,
 * accent-insensitive on the ASCII fallback. Returns at most `limit` results.
 */
export function searchCities(cities: City[], query: string, limit = 8): City[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const startsWith: City[] = [];
  const contains: City[] = [];

  for (const city of cities) {
    const name = city.name.toLowerCase();
    const ascii = city.asciiName.toLowerCase();
    if (name.startsWith(q) || ascii.startsWith(q)) {
      startsWith.push(city);
      if (startsWith.length >= limit) break;
      continue;
    }
    if (name.includes(q) || ascii.includes(q)) {
      contains.push(city);
    }
  }

  return [...startsWith, ...contains].slice(0, limit);
}

export const CITY_SEARCH_DEBOUNCE_MS = DEBOUNCE_MS;
