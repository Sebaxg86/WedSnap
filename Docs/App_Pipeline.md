# App Pipeline

This document explains the runtime flow of the current WedSnap app.

## 1. Browser Entry Pipeline

1. The browser loads [index.html](../index.html).
2. Vite mounts the React app through [main.tsx](../src/main.tsx).
3. `main.tsx` loads the global stylesheet from [globals.css](../src/styles/globals.css).
4. `main.tsx` renders [App.tsx](../src/app/App.tsx).
5. `App.tsx` delegates routing to [router.tsx](../src/app/router.tsx).
6. The router wraps each page in [AppShell.tsx](../src/shared/layouts/AppShell.tsx).
7. The selected route renders the feature page, such as:
   - [GuestUploadPage.tsx](../src/features/guest-upload/pages/GuestUploadPage.tsx)
   - [AdminDashboardPage.tsx](../src/features/admin/pages/AdminDashboardPage.tsx)

## 2. Guest Upload Runtime Pipeline

1. The user opens `/upload?t=<qr-token>`.
2. [GuestUploadPage.tsx](../src/features/guest-upload/pages/GuestUploadPage.tsx) reads the QR token from the URL.
3. The page captures device context through [getDeviceContext.ts](../src/lib/device/getDeviceContext.ts).
4. The page delegates file picking to [UploadDropzone.tsx](../src/features/guest-upload/components/UploadDropzone.tsx).
5. The page delegates selected-file rendering to [PhotoSelectionSummary.tsx](../src/features/guest-upload/components/PhotoSelectionSummary.tsx).
6. Validation rules come from [guestUploadSchema.ts](../src/features/guest-upload/lib/guestUploadSchema.ts).
7. [guestUploadService.ts](../src/features/guest-upload/lib/guestUploadService.ts) ensures an anonymous Supabase session exists.
8. The same service validates the QR token through `get_guest_upload_context`.
9. On submit, the service calls `start_guest_upload`, uploads files to Storage, calls `register_uploaded_photo`, and closes the batch with `finish_guest_upload`.

## 3. Admin Runtime Pipeline

1. The user opens `/admin`.
2. [router.tsx](../src/app/router.tsx) renders [AdminDashboardPage.tsx](../src/features/admin/pages/AdminDashboardPage.tsx).
3. The dashboard signs in through Supabase Auth.
4. It verifies admin access against `admin_profiles`.
5. It loads the active event and its `qr_codes`.
6. It lets the admin create missing tables, rename group assignments, regenerate tokens, and share QR codes.

## 4. Environment and Supabase Pipeline

1. Public environment variables are read from Vite at build/runtime.
2. [env.ts](../src/lib/config/env.ts) validates and exposes client-safe config.
3. [client.ts](../src/lib/supabase/client.ts) creates the Supabase browser client.
4. Feature modules import the shared client instead of instantiating their own.
5. The current live integration only requires:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 5. Styling Pipeline

1. [globals.css](../src/styles/globals.css) defines tokens, layout primitives, and shared component classes.
2. Layout and feature components consume those classes directly.
3. If a visual change affects the whole app, start in `globals.css`.
4. If a visual change is specific to one page, start in that page/component first.

## 6. Debugging Rule Of Thumb

When something breaks, follow this order:

1. Entry and route: `index.html` -> `main.tsx` -> `app/router.tsx`
2. Feature page: route page in `src/features/.../pages`
3. Feature helpers/components: `components/` and `lib/`
4. Shared infrastructure: `src/lib/`, `src/shared/`, `src/styles/`
5. Database and backend contract: `Docs/Db/`
