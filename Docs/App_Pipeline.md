# App Pipeline

This document explains the runtime flow of the current WeddVue app.

## 1. Browser Entry Pipeline

1. The browser loads [index.html](../index.html).
2. Vite mounts the React app through [main.tsx](../src/main.tsx).
3. `main.tsx` loads the global stylesheet from [globals.css](../src/styles/globals.css).
4. `main.tsx` renders [App.tsx](../src/app/App.tsx).
5. `App.tsx` delegates routing to [router.tsx](../src/app/router.tsx).
6. The router wraps each page in [AppShell.tsx](../src/shared/layouts/AppShell.tsx).
7. The selected route renders the feature page, such as:
   - [HomeLandingPage.tsx](../src/features/home/pages/HomeLandingPage.tsx)
   - [AuthPage.tsx](../src/features/auth/pages/AuthPage.tsx)
   - [DashboardPage.tsx](../src/features/dashboard/pages/DashboardPage.tsx)
   - [EventWorkspacePage.tsx](../src/features/events/pages/EventWorkspacePage.tsx)
   - [GuestUploadPage.tsx](../src/features/guest-upload/pages/GuestUploadPage.tsx)

## 2. Public To Owner Pipeline

1. A couple lands on `/`.
2. The CTA sends them to `/auth`.
3. [AuthPage.tsx](../src/features/auth/pages/AuthPage.tsx) signs in or creates the account through Supabase Auth.
4. [useSupabaseSession.ts](../src/lib/supabase/useSupabaseSession.ts) distinguishes a real account session from an anonymous guest session.
5. Authenticated owners enter `/dashboard`.
6. [DashboardPage.tsx](../src/features/dashboard/pages/DashboardPage.tsx) loads only the events linked to `events.owner_user_id = auth.uid()`.
7. Creating an event sends the owner directly to `/dashboard/events/:eventId`.

## 3. Event Workspace Pipeline

1. The owner opens `/dashboard/events/:eventId`.
2. [EventWorkspacePage.tsx](../src/features/events/pages/EventWorkspacePage.tsx) loads the event and its `qr_codes`.
3. [EventSetupPanel.tsx](../src/features/events/components/EventSetupPanel.tsx) lets the owner create missing tables.
4. [TableQrCard.tsx](../src/features/events/components/TableQrCard.tsx) lets the owner rename the group, enable or disable the table, regenerate tokens, and share or download the QR.
5. Each QR points to `/upload?t=<qr-token>`.

## 4. Guest Upload Runtime Pipeline

1. The guest opens `/upload?t=<qr-token>`.
2. [GuestUploadPage.tsx](../src/features/guest-upload/pages/GuestUploadPage.tsx) reads the QR token from the URL.
3. The page captures device context through [getDeviceContext.ts](../src/lib/device/getDeviceContext.ts).
4. The page delegates file picking to [UploadDropzone.tsx](../src/features/guest-upload/components/UploadDropzone.tsx).
5. The page delegates selected-file rendering to [PhotoSelectionSummary.tsx](../src/features/guest-upload/components/PhotoSelectionSummary.tsx).
6. Validation rules come from [guestUploadSchema.ts](../src/features/guest-upload/lib/guestUploadSchema.ts).
7. [guestUploadService.ts](../src/features/guest-upload/lib/guestUploadService.ts) ensures a Supabase session exists, creating an anonymous one when needed.
8. The same service validates the QR token through `get_guest_upload_context`.
9. On submit, the service calls `start_guest_upload`, uploads files to Storage, calls `register_uploaded_photo`, and closes the batch with `finish_guest_upload`.

## 5. Environment and Supabase Pipeline

1. Public environment variables are read from Vite at build/runtime.
2. [env.ts](../src/lib/config/env.ts) validates and exposes client-safe config.
3. [client.ts](../src/lib/supabase/client.ts) creates the Supabase browser client.
4. [useSupabaseSession.ts](../src/lib/supabase/useSupabaseSession.ts) centralizes auth session bootstrap for owner-facing pages.
5. The current live integration only requires:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 6. Styling Pipeline

1. [globals.css](../src/styles/globals.css) defines tokens, layout primitives, and shared component classes.
2. Layout and feature components consume those classes directly.
3. If a visual change affects the whole app, start in `globals.css`.
4. If a visual change is specific to one page, start in that page or component first.

## 7. Debugging Rule Of Thumb

When something breaks, follow this order:

1. Entry and route: `index.html` -> `main.tsx` -> `app/router.tsx`
2. Feature page: route page in `src/features/.../pages`
3. Feature helpers/components: `components/` and `lib/`
4. Shared infrastructure: `src/lib/`, `src/shared/`, `src/styles/`
5. Database and backend contract: `Docs/Db/`
