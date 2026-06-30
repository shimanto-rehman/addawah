# Plan: Username + Email Login (Single Input Field)

## Goal
Users can sign in with either **username** or **email** in a single input field. The system dynamically detects which one it is and validates accordingly. Mobile login stays untouched.

## Changes Required

### 1. Login API (`app/api/auth/login/route.ts`)
- Add `identifier` field to Zod schema (string, optional)
- Keep `email` and `mobile` for backward compatibility
- If `identifier` is provided:
  - If it contains `@` → treat as email, validate with `isValidEmail`, lookup by email
  - If it doesn't contain `@` → treat as username, sanitize with `sanitizeUsername`, lookup by username
- Keep mobile branch untouched

### 2. Login Form (`components/auth/LoginPageClient.tsx`)
- In the "Email" sign-in mode, change the input label to "Email or Username"
- Change the field name from `email` to `identifier`
- On submit, send `{ identifier, password }` instead of `{ email, password }`
- Add client-side detection: if input contains `@` → validate as email; otherwise treat as username (min 3 chars)
- Show helper text below input: "Logging in as email" or "Logging in as username" as user types
- Mobile toggle stays exactly as-is

### 3. Check-Availability Endpoint (`app/api/auth/check-availability/route.ts`)
- Add Redis caching to username and email lookups
- Cache key: `avail:username:{value}` or `avail:email:{value}`
- Cache TTL: 30 seconds (short, since availability can change)
- If cached, return cached result without DB query
- If not cached, query DB, cache result, return

### 4. No Schema/DB Changes
- User model already has `username @unique` and `email @unique`
- No migration needed

## Files to Modify
1. `app/api/auth/login/route.ts` — accept `identifier` field
2. `components/auth/LoginPageClient.tsx` — single input for email/username
3. `app/api/auth/check-availability/route.ts` — add Redis caching

## Files NOT to Modify
- `lib/phone-countries.ts` — mobile untouched
- `components/auth/PhoneInput.tsx` — mobile untouched
- Any registration flow — untouched
