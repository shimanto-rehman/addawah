# Addawah (Dawa)

**Pray Together. Grow Together. Inspire Each Other.**

Free Islamic web platform for salah tracking, accountability, daily inspiration, and community support — built per the ADDAWAH BRD v4.0.

## Features

- Public landing page with mission & tutorial
- Authentication (email + password sessions)
- Weekly Salah tracker with ornate arch frame background
- Hero statistics card (today, week, streak, lifetime)
- Hijri calendar display
- Lifetime analytics charts
- Friend system with gentle reminder (poke)
- Daily Islamic inspiration
- 6 theme colors (Green, Blue, Gold, Purple, Silver, Pink)
- Dark & Light modes
- Framer Motion animations throughout

## Stack

- Next.js 14 + React + TypeScript
- Tailwind CSS + custom Islamic gold theme
- Framer Motion
- Prisma + PostgreSQL (Neon recommended)
- Session auth (JWT cookie)

## Setup

1. **Install dependencies**

```bash
npm install
```

2. **Configure environment**

Copy `.env.example` to `.env` and set:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="your-long-random-secret"
```

For local dev, [Neon](https://neon.tech) free tier works well.

3. **Push database schema**

```bash
npm run db:push
```

4. **Add gate arch image**

Place your ornate arch PNG at:

```
public/images/gate-arch.png
```

This is used as the Salah tracker card background.

5. **Run dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

1. Connect repo to Vercel
2. Set `DATABASE_URL` and `AUTH_SECRET` env vars
3. Deploy — run `prisma db push` against production DB once

## Project Structure

```
app/
  (app)/          # Authenticated shell
    dashboard/    # Salah tracker + stats + Hijri + inspiration
    friends/      # Friends + pokes
    analytics/    # Lifetime charts
    settings/     # Themes + profile
  api/            # REST endpoints
  login/          # Auth page
  page.tsx        # Landing page
components/       # UI components
lib/              # Auth, prisma, salah utils
prisma/           # Database schema
```

## License

Built for the ummah — free to use.
