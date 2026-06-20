export type CountryPhone = {
  iso: string;
  name: string;
  dial: string;
  digits: number;
};

/** Max digit boxes per row before wrapping to a second line */
export const PHONE_DIGITS_PER_ROW = 10;

/**
 * National mobile digits after country code (no trunk 0).
 */
const PHONE_COUNTRIES_RAW: CountryPhone[] = [
  { iso: 'AF', name: 'Afghanistan', dial: '+93', digits: 9 },
  { iso: 'AL', name: 'Albania', dial: '+355', digits: 9 },
  { iso: 'DZ', name: 'Algeria', dial: '+213', digits: 9 },
  { iso: 'AM', name: 'Armenia', dial: '+374', digits: 8 },
  { iso: 'AZ', name: 'Azerbaijan', dial: '+994', digits: 9 },
  { iso: 'BH', name: 'Bahrain', dial: '+973', digits: 8 },
  { iso: 'BD', name: 'Bangladesh', dial: '+880', digits: 10 },
  { iso: 'BT', name: 'Bhutan', dial: '+975', digits: 8 },
  { iso: 'BN', name: 'Brunei', dial: '+673', digits: 7 },
  { iso: 'BF', name: 'Burkina Faso', dial: '+226', digits: 8 },
  { iso: 'KH', name: 'Cambodia', dial: '+855', digits: 9 },
  { iso: 'CA', name: 'Canada', dial: '+1', digits: 10 },
  { iso: 'TD', name: 'Chad', dial: '+235', digits: 8 },
  { iso: 'CN', name: 'China', dial: '+86', digits: 11 },
  { iso: 'KM', name: 'Comoros', dial: '+269', digits: 7 },
  { iso: 'DJ', name: 'Djibouti', dial: '+253', digits: 8 },
  { iso: 'EG', name: 'Egypt', dial: '+20', digits: 10 },
  { iso: 'FR', name: 'France', dial: '+33', digits: 9 },
  { iso: 'GM', name: 'Gambia', dial: '+220', digits: 7 },
  { iso: 'GE', name: 'Georgia', dial: '+995', digits: 9 },
  { iso: 'DE', name: 'Germany', dial: '+49', digits: 11 },
  { iso: 'GN', name: 'Guinea', dial: '+224', digits: 9 },
  { iso: 'GW', name: 'Guinea-Bissau', dial: '+245', digits: 7 },
  { iso: 'HK', name: 'Hong Kong', dial: '+852', digits: 8 },
  { iso: 'IN', name: 'India', dial: '+91', digits: 10 },
  { iso: 'ID', name: 'Indonesia', dial: '+62', digits: 10 },
  { iso: 'IR', name: 'Iran', dial: '+98', digits: 10 },
  { iso: 'IQ', name: 'Iraq', dial: '+964', digits: 10 },
  { iso: 'JP', name: 'Japan', dial: '+81', digits: 10 },
  { iso: 'JO', name: 'Jordan', dial: '+962', digits: 9 },
  { iso: 'KZ', name: 'Kazakhstan', dial: '+7', digits: 10 },
  { iso: 'XK', name: 'Kosovo', dial: '+383', digits: 8 },
  { iso: 'KW', name: 'Kuwait', dial: '+965', digits: 8 },
  { iso: 'KG', name: 'Kyrgyzstan', dial: '+996', digits: 9 },
  { iso: 'LA', name: 'Laos', dial: '+856', digits: 10 },
  { iso: 'LB', name: 'Lebanon', dial: '+961', digits: 8 },
  { iso: 'LY', name: 'Libya', dial: '+218', digits: 9 },
  { iso: 'MO', name: 'Macau', dial: '+853', digits: 8 },
  { iso: 'MY', name: 'Malaysia', dial: '+60', digits: 9 },
  { iso: 'MV', name: 'Maldives', dial: '+960', digits: 7 },
  { iso: 'ML', name: 'Mali', dial: '+223', digits: 8 },
  { iso: 'MR', name: 'Mauritania', dial: '+222', digits: 8 },
  { iso: 'MN', name: 'Mongolia', dial: '+976', digits: 8 },
  { iso: 'MA', name: 'Morocco', dial: '+212', digits: 9 },
  { iso: 'MM', name: 'Myanmar', dial: '+95', digits: 10 },
  { iso: 'NP', name: 'Nepal', dial: '+977', digits: 10 },
  { iso: 'NE', name: 'Niger', dial: '+227', digits: 8 },
  { iso: 'NG', name: 'Nigeria', dial: '+234', digits: 10 },
  { iso: 'OM', name: 'Oman', dial: '+968', digits: 8 },
  { iso: 'PK', name: 'Pakistan', dial: '+92', digits: 10 },
  { iso: 'PS', name: 'Palestine', dial: '+970', digits: 9 },
  { iso: 'PH', name: 'Philippines', dial: '+63', digits: 10 },
  { iso: 'QA', name: 'Qatar', dial: '+974', digits: 8 },
  { iso: 'RU', name: 'Russia', dial: '+7', digits: 10 },
  { iso: 'SA', name: 'Saudi Arabia', dial: '+966', digits: 9 },
  { iso: 'SN', name: 'Senegal', dial: '+221', digits: 9 },
  { iso: 'SL', name: 'Sierra Leone', dial: '+232', digits: 8 },
  { iso: 'SG', name: 'Singapore', dial: '+65', digits: 8 },
  { iso: 'SO', name: 'Somalia', dial: '+252', digits: 8 },
  { iso: 'ZA', name: 'South Africa', dial: '+27', digits: 9 },
  { iso: 'KR', name: 'South Korea', dial: '+82', digits: 10 },
  { iso: 'LK', name: 'Sri Lanka', dial: '+94', digits: 9 },
  { iso: 'SD', name: 'Sudan', dial: '+249', digits: 9 },
  { iso: 'SY', name: 'Syria', dial: '+963', digits: 9 },
  { iso: 'TW', name: 'Taiwan', dial: '+886', digits: 9 },
  { iso: 'TJ', name: 'Tajikistan', dial: '+992', digits: 9 },
  { iso: 'TH', name: 'Thailand', dial: '+66', digits: 9 },
  { iso: 'TL', name: 'Timor-Leste', dial: '+670', digits: 8 },
  { iso: 'TN', name: 'Tunisia', dial: '+216', digits: 8 },
  { iso: 'TR', name: 'Turkey', dial: '+90', digits: 10 },
  { iso: 'TM', name: 'Turkmenistan', dial: '+993', digits: 8 },
  { iso: 'AE', name: 'United Arab Emirates', dial: '+971', digits: 9 },
  { iso: 'GB', name: 'United Kingdom', dial: '+44', digits: 10 },
  { iso: 'US', name: 'United States', dial: '+1', digits: 10 },
  { iso: 'UZ', name: 'Uzbekistan', dial: '+998', digits: 9 },
  { iso: 'VN', name: 'Vietnam', dial: '+84', digits: 9 },
  { iso: 'YE', name: 'Yemen', dial: '+967', digits: 9 },
];

export const PHONE_COUNTRIES = [...PHONE_COUNTRIES_RAW].sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const DEFAULT_PHONE_COUNTRY =
  PHONE_COUNTRIES.find((c) => c.iso === 'BD') ?? PHONE_COUNTRIES[0];

export function flagEmoji(iso: string): string {
  if (iso === 'XK') return '🇽🇰';
  return iso
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function findCountryByDial(dial: string): CountryPhone | undefined {
  return PHONE_COUNTRIES.find((c) => c.dial === dial);
}

export function findCountryByIso(iso: string): CountryPhone | undefined {
  return PHONE_COUNTRIES.find((c) => c.iso === iso);
}

export function emptyDigits(country: CountryPhone): string[] {
  return Array.from({ length: country.digits }, () => '');
}

export function parseE164(mobile: string): { country: CountryPhone; digits: string[] } | null {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return null;

  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const country of sorted) {
    if (normalized.startsWith(country.dial)) {
      const raw = normalized.slice(country.dial.length).replace(/\D/g, '');
      if (raw.length !== country.digits) return null;
      return { country, digits: raw.split('') };
    }
  }
  return null;
}

export function buildE164(country: CountryPhone, digits: string[]): string {
  const joined = digits.join('').replace(/\D/g, '');
  return `${country.dial}${joined}`;
}

export function normalizeMobile(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;
  if (!digits.startsWith('+')) digits = `+${digits.replace(/^\+/, '')}`;

  const normalized = `+${digits.slice(1).replace(/\D/g, '')}`;
  if (!/^\+[1-9]\d{6,14}$/.test(normalized)) return null;
  return normalized;
}

export function isValidMobileForCountry(country: CountryPhone, digits: string[]): boolean {
  const joined = digits.join('');
  return joined.length === country.digits && /^\d+$/.test(joined);
}
