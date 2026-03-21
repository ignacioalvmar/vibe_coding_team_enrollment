# Vibe coding · Team enrollment

Next.js app for **UXD Vibe coding**: students enter a `@thi.de` email (format check only — no OAuth), join or move between teams with **three seats** each, and instructors download a CSV roster.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4  
- **Auth.js v5** (`next-auth`) with a **credentials** provider: session after a valid `@thi.de` address (no password, no identity proof — honor system)  
- **Drizzle ORM** + **postgres.js** (works with **Supabase** Postgres and any `DATABASE_URL`)

## Local setup

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Fill `.env.local` (see table below).

3. Apply the schema to your database (choose one):

   - **Push (simple for dev):** `npm run db:push`
   - **Migrate:** run the SQL in [`drizzle/0000_init.sql`](drizzle/0000_init.sql) on your DB, or wire up [`drizzle-kit migrate`](https://orm.drizzle.team/docs/migrations) in your workflow.

4. Seed example teams (idempotent by team name; **3 seats** per team):

   ```bash
   npm run db:seed
   ```

5. Run the app:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string (SSL in production). |
| `AUTH_SECRET` | Session signing (required in production). Generate e.g. `openssl rand -base64 32`. In **development**, the app uses a built-in fallback if unset so login works without `.env.local`; set this for stable cookies across restarts. |
| `AUTH_URL` | Public site URL (`http://localhost:3000` locally, `https://…vercel.app` in prod). |
| `ADMIN_EXPORT_SECRET` | Shared secret for CSV export (Bearer token). |

## Deploy on Vercel

1. Create a **Supabase** project, open **Project Settings → Database**, and copy the **URI** (use the **Transaction pooler** string for serverless). Set it as `DATABASE_URL` in Vercel.  
2. Import the GitHub repo as a new Vercel project.  
3. Set all variables from `.env.example` in **Project → Settings → Environment Variables**.  
4. Redeploy. From your machine (with `DATABASE_URL` pointing at production), run:

   ```bash
   npm run db:push
   npm run db:seed
   ```

   …or run the SQL migration + seed using your preferred toolchain.

## CSV export

- **API:** `GET /api/admin/export` with header `Authorization: Bearer <ADMIN_EXPORT_SECRET>`.  
- **UI:** [`/admin`](./app/admin/page.tsx) — paste the same secret and download `team-enrollments.csv`.

Columns: `team_id`, `team_name`, `student_email`, `enrolled_at`.

## Scripts

| Script | Command |
|--------|---------|
| Dev server | `npm run dev` |
| Lint | `npm run lint` |
| Drizzle: generate migration | `npm run db:generate` |
| Drizzle: push schema | `npm run db:push` |
| Drizzle Studio | `npm run db:studio` |
| Seed teams | `npm run db:seed` |

## Notes

- One enrollment row per student email (`UNIQUE(student_email)`); **join** and **move** are handled atomically in SQL where possible.  
- Team capacity is **3** in [`scripts/seed.ts`](scripts/seed.ts) — adjust before seeding or update rows in the database for your class.  
- Email validation only checks that the address uses the `thi.de` domain (not e.g. `@notthi.de`). There is no verification that the person owns that inbox.
