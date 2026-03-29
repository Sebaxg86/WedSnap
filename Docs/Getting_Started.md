# Getting Started

This guide explains how to run the current repository locally and connect it to Supabase.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- A Supabase project
- A private Supabase Storage bucket named `fotos-boda`

## 1. Install Dependencies

From the repository root:

```bash
npm install
```

## 2. Configure Environment Variables

Create a local `.env` file based on `.env.example` and set:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TURNSTILE_SITE_KEY=
```

Right now, the live frontend flow only requires:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The server-side secrets remain optional for a later hardening phase:

- `SUPABASE_PROJECT_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TURNSTILE_SECRET_KEY`

Do not commit real secrets to Git.

## 3. Prepare Supabase

1. Open Supabase SQL Editor.
2. Run [Migration_Script.sql](Db/Migration_Script.sql).
3. Enable Anonymous Sign-Ins in `Authentication -> Providers -> Anonymous`.
4. Create your first admin user in Supabase Auth.
5. Run [Supabase_seed_template.sql](Db/Supabase_seed_template.sql) after replacing the placeholders.
6. Keep [Database_schema.sql](Db/Database_schema.sql) only as the exported reference snapshot of the current live database.

## 4. Run The App

Start the local development server:

```bash
npm run dev
```

Vite will print the local URL, typically:

```text
http://localhost:5173
```

## 5. Quick Test Routes

- Guest flow: `http://localhost:5173/upload?t=<your-table-token>`
- Admin flow: `http://localhost:5173/admin`

## 6. Suggested Initial Frontend Structure

The project is currently organized like this:

```text
src/
  app/
    App.tsx
    router.tsx
  features/
    guest-upload/
      components/
      lib/
      pages/
    admin/
      components/
      lib/
      pages/
  lib/
    config/
    device/
    supabase/
  shared/
    layouts/
    pages/
    utils/
  styles/
```

## MVP Build Order

1. Guest upload flow from QR token to private bucket.
2. Admin QR and table setup.
3. Admin media review and download flow.
4. Optional hardening with Turnstile and Edge Functions.
