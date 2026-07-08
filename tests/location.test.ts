import { describe, it, expect } from 'vitest';
import {
  prayerLocationFromUser,
  type PrayerLocation,
} from '@/lib/prayer-times';
import { searchCities, type City } from '@/lib/city-dataset';

describe('prayerLocationFromUser', () => {
  it('returns coords when both latitude and longitude are numbers', () => {
    const loc = prayerLocationFromUser({
      latitude: 23.81,
      longitude: 90.41,
      city: 'Dhaka',
      country: 'Bangladesh',
    });
    expect(loc).toEqual<PrayerLocation>({
      kind: 'coords',
      latitude: 23.81,
      longitude: 90.41,
    });
  });

  it('falls back to named city/country when coords are null', () => {
    const loc = prayerLocationFromUser({
      latitude: null,
      longitude: null,
      city: '  Istanbul  ',
      country: 'Türkiye',
    });
    expect(loc).toEqual<PrayerLocation>({
      kind: 'named',
      city: 'Istanbul',
      country: 'Türkiye',
    });
  });

  it('returns null when neither coords nor a complete city/country pair is set', () => {
    expect(
      prayerLocationFromUser({ latitude: null, longitude: null, city: 'Dhaka', country: '' }),
    ).toBeNull();
    expect(
      prayerLocationFromUser({ latitude: null, longitude: null, city: null, country: null }),
    ).toBeNull();
    expect(
      prayerLocationFromUser({ latitude: 23.81, longitude: null, city: null, country: null }),
    ).toBeNull();
  });
});

describe('searchCities', () => {
  const sample: City[] = [
    { id: 'dhaka,bd,0', name: 'Dhaka', asciiName: 'Dhaka', latitude: 23.81, longitude: 90.41, countryCode: 'BD', countryName: 'Bangladesh', timeZone: 'Asia/Dhaka' },
    { id: 'delhi,in,1', name: 'Delhi', asciiName: 'Delhi', latitude: 28.65, longitude: 77.23, countryCode: 'IN', countryName: 'India', timeZone: 'Asia/Kolkata' },
    { id: 'dallas,us,2', name: 'Dallas', asciiName: 'Dallas', latitude: 32.79, longitude: -96.8, countryCode: 'US', countryName: 'United States', timeZone: 'America/Chicago' },
    { id: 'doha,qa,3', name: 'Doha', asciiName: 'Doha', latitude: 25.29, longitude: 51.51, countryCode: 'QA', countryName: 'Qatar', timeZone: 'Asia/Qatar' },
  ];

  it('prefix matches rank ahead of substring matches', () => {
    const results = searchCities(sample, 'Da');
    expect(results.length).toBeGreaterThan(0);
    // Dallas and Dhaka both prefix-match "Da"; Delhi only substrings.
    expect(results[0].asciiName === 'Dallas' || results[0].asciiName === 'Dhaka').toBe(true);
  });

  it('returns empty for queries shorter than threshold', () => {
    expect(searchCities(sample, 'D').length).toBe(0);
  });

  it('respects the limit argument', () => {
    expect(searchCities(sample, 'Da', 1).length).toBe(1);
  });

  it('is case-insensitive', () => {
    expect(searchCities(sample, 'dOHA')[0]?.asciiName).toBe('Doha');
  });
});
