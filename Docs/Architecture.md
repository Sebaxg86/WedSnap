# Architecture Overview

This document describes the current WeddVue product architecture.

## Product Goal

WeddVue now behaves like a reusable wedding product:

- anyone can discover the public landing page
- the couple creates an account and enters a private dashboard
- each account can create one or more events
- each event manages its own tables and QR codes
- guests never enter through the public dashboard flow
- guests upload photos only through QR-generated links

## Core Flows

### Owner Flow

1. The owner lands on `/`.
2. The CTA sends them to `/auth`.
3. Supabase Auth handles login or account creation.
4. The account enters `/dashboard`.
5. The dashboard lists only the events owned by that account.
6. The owner creates a new event or opens an existing one.
7. Inside the event workspace, the owner generates tables, assigns family names, and shares QR codes.

### Guest Upload Flow

1. A guest scans a table QR code.
2. The site opens `/upload?t=<token>`.
3. The frontend creates a frictionless anonymous Supabase session when needed.
4. The frontend validates the QR token through a secure RPC function.
5. The guest enters a name and selects up to 10 photos.
6. The client compresses images before upload.
7. Another RPC creates an `upload_batch` and increments QR scan tracking.
8. Files are uploaded directly to the private `fotos-boda` bucket under the guest auth path.
9. A secure RPC registers each uploaded file in `photos`.
10. A final RPC closes the batch with photo count and status.

## Security Model

- Owner-facing pages require a real Supabase account session.
- Guest upload pages can run on anonymous Supabase sessions.
- The app distinguishes anonymous sessions from real owner sessions in the frontend.
- The storage bucket remains private.
- Event ownership lives in `events.owner_user_id`.
- RLS allows an owner to see only their own events, QR codes, upload batches, photos, and related storage objects.
- `admin_profiles` can still exist as an optional super-admin mechanism or for legacy compatibility.
- Device and browser details are stored per upload batch for traceability.

## Data Model

### `events`

Represents one wedding or celebration and belongs to an account through `owner_user_id`.

### `qr_codes`

Stores one token per table, plus the numeric table identifier and optional family/group name so uploads can be traced back to a specific table assignment.

### `upload_batches`

Represents one guest submission. This table stores the guest name, QR relation, anonymous auth user, status, and device or browser context.

### `photos`

Stores one row per uploaded file and points to the private object path in Supabase Storage.

### `admin_profiles`

Optional table for privileged operators or backwards compatibility with the previous single-admin architecture.

## Credentials Needed Right Now

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Optional Later Credentials

- `SUPABASE_PROJECT_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TURNSTILE_SECRET_KEY`

Those later credentials are only needed if you decide to harden the system further with Edge Functions, signed upload URLs, or anti-bot checks.

## Operational Notes

- Upgrade Supabase to Pro a few days before a real event, not the same day.
- Enable Anonymous Sign-Ins in Supabase Auth before testing the guest flow.
- Test uploads on at least two iPhones and two Android devices.
- Test with both Wi-Fi and cellular data.
- Keep the upload screen minimal and avoid any non-essential animations.
- Limit upload concurrency to reduce failures on weak networks.
