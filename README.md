# VendorMaps

An interactive map and directory that gives street vendors, food trucks,
home-based businesses, markets, and pop-up events an online presence — so a
wider audience can find them whether or not they're active on social media.
It's a community directory: any signed-in user can add or edit listings, and
edits re-enter moderation before going public.

## Tech stack

- **Next.js 16** (App Router, React 19) — note: this is a newer Next.js with
  breaking changes; see [AGENTS.md](AGENTS.md).
- **PostgreSQL** (Neon) with PostGIS, accessed via the [`postgres`](https://github.com/porsager/postgres) tagged-template client ([lib/db.ts](lib/db.ts)).
- **better-auth** for authentication (email/password + Google OAuth).
- **HERE Maps JS API** for the interactive map ([components/map/HereMap.tsx](components/map/HereMap.tsx)).
- **Cloudinary** for user-uploaded media (logos, photos, flyers).
- **Resend** for transactional email ([lib/email.ts](lib/email.ts)).
- **Tailwind CSS v4** + **Framer Motion**.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env.local` in the project root with the following keys:

```bash
# Database (Neon Postgres). DATABASE_URL is pooled; DIRECT is for migrations.
DATABASE_URL=postgres://...
DATABASE_URL_DIRECT=postgres://...

# HERE Maps — the NEXT_PUBLIC key is exposed to the browser map component.
HERE_API_KEY=...
NEXT_PUBLIC_HERE_API_KEY=...

# Cloudinary (media uploads)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# better-auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Email (Resend)
RESEND_API_KEY=...
SUPPORT_EMAIL=...
NOREPLY_EMAIL=...

# The single admin user (gates /admin and admin APIs)
ADMIN_USER_ID=...
```

### 3. Set up the database

Apply the schema migrations in order, then optionally seed sample data:

```bash
# Apply every migration in db/schema in filename order
for f in db/schema/*.sql; do psql "$DATABASE_URL_DIRECT" -f "$f"; done

# Optional: sample data for local development
psql "$DATABASE_URL_DIRECT" -f db/seeds/sample_data.sql
```

> Migrations are plain numbered SQL files in [db/schema/](db/schema/) — apply
> any not-yet-applied ones in order. Use the direct (non-pooled) connection
> string for DDL.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command         | Description                |
| --------------- | ------------------------- |
| `npm run dev`   | Start the dev server      |
| `npm run build` | Production build          |
| `npm run start` | Serve the production build |
| `npm run lint`  | Run ESLint                |

## Project layout

```
app/
  api/            Route handlers (businesses, resources, reviews, auth, admin, …)
  admin/          Moderation dashboard (gated by ADMIN_USER_ID)
  add-business/   Multi-step business submission flow
  [slug]/         Public business profile page
  ...             Directory, resources, saved, profile, auth pages
components/
  map/            HereMap and map UI
  forms/          Multi-step add/edit form steps
  ui/             Shared UI (Lightbox, SaveButton, …)
db/
  schema/         Ordered SQL migrations
  seeds/          Sample data
lib/
  db.ts           Postgres client + PgError helpers
  auth.ts         better-auth server config
  email.ts        Resend email module
  types/          Shared types (business, resource, HERE SDK ambient types)
```

## Conventions

- **SQL safety:** all queries use the `postgres` tagged-template client, which
  binds `${…}` as parameters — never string-interpolate user input into SQL.
- **Moderation:** new and edited listings/resources are set to `pending` and
  re-enter review before appearing publicly. Expiry is enforced at query time.
- **Media:** all user uploads go to Cloudinary; `next/image` is configured to
  optimize that domain in [next.config.ts](next.config.ts).
- **Brand color:** orange `#FF7300`.
