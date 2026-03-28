# Getting Started

This guide explains how to initialize the project in this repository and prepare it for local development.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- A Supabase project
- A private Supabase Storage bucket named `fotos-boda`

## 1. Initialize React With Vite

From the repository root, scaffold the frontend in place:

```bash
npm create vite@latest . -- --template react
```

If you prefer TypeScript instead of JavaScript:

```bash
npm create vite@latest . -- --template react-ts
```

Because the repository already contains files, Vite may warn that the current directory is not empty. Continue and keep the existing files.

## 2. Install Dependencies

After Vite scaffolds the app, install the dependencies:

```bash
npm install
```

Recommended packages for the MVP:

```bash
npm install @supabase/supabase-js react-router-dom
```

Recommended utility packages for later upload flows:

```bash
npm install browser-image-compression ua-parser-js zod
```

## 3. Configure Environment Variables

Create a local `.env` file based on `.env.example` and set the values from Supabase:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TURNSTILE_SITE_KEY=
SUPABASE_PROJECT_ID=
SUPABASE_SERVICE_ROLE_KEY=
TURNSTILE_SECRET_KEY=
```

Do not commit real secrets to Git.

## 4. Run The App

Start the local development server:

```bash
npm run dev
```

Vite will print the local URL, typically:

```text
http://localhost:5173
```

## 5. Prepare Supabase

1. Open Supabase SQL Editor.
2. Run [Migration_Script.sql](Db/Migration_Script.sql).
3. Create your first admin user in Supabase Auth.
4. Run [Supabase_seed_template.sql](Db/Supabase_seed_template.sql) after replacing the placeholders.
5. Keep [Database_schema.sql](Db/Database_schema.sql) only as the exported reference snapshot of the current live database.

## 6. Suggested Initial Frontend Structure

Once the React app is generated, start with a structure similar to:

```text
src/
  app/
  features/
    guest-upload/
    admin/
  lib/
    supabase/
    utils/
  routes/
```

## MVP Build Order

1. Guest landing page from QR token.
2. Guest upload form with name input and multi-image picker.
3. Edge Function for signed upload URLs and batch creation.
4. Admin login and private gallery.
5. Download and favorite actions.
