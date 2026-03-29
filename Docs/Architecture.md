# Architecture Overview

This document describes the current WedSnap product architecture.

## Product Goal

Guests scan a QR code placed on their table, enter their name, and upload up to 10 photos per batch with the lowest possible friction.

Uploaded photos remain private. Guests cannot browse other uploads. Admins can configure tables and later review private media from a protected dashboard.

## Core Flows

### Guest Upload Flow

1. Guest scans a table QR code.
2. The site opens `/upload?t=<token>`.
3. The frontend creates a frictionless anonymous Supabase session.
4. The frontend validates the QR token through a secure RPC function.
5. The guest enters a name and selects up to 10 photos.
6. The client compresses images before upload.
7. Another RPC creates an `upload_batch` and increments QR scan tracking.
8. Files are uploaded directly to the private `fotos-boda` bucket under the guest auth path.
9. A secure RPC registers each uploaded file in `photos`.
10. A final RPC closes the batch with photo count and status.

### Admin Flow

1. Admin signs in with Supabase Auth.
2. Admin opens a private dashboard.
3. Admin configures the number of tables for the event.
4. Admin assigns a family or group name to each table.
5. The dashboard generates one QR token per table.
6. The dashboard queries `events`, `qr_codes`, and later `upload_batches` and `photos`.
7. Admin can share, download, and manage per-table QR codes from a phone.

## Security Model

- Guests do not create visible accounts; Supabase anonymous auth happens behind the scenes.
- The storage bucket remains private.
- Guest uploads are limited by RLS policies plus path restrictions in `storage.objects`.
- Admin data access is protected by Supabase Auth plus RLS policies.
- Device and browser details are stored per upload batch for traceability.
- IP addresses should be stored as hashes, not raw values, if they are later added server-side.

## Data Model

### `events`

Represents the wedding or future multi-event support.

### `admin_profiles`

Maps `auth.users` accounts to admin roles.

### `qr_codes`

Stores one token per table, plus the numeric table identifier and optional family/group name so uploads can be traced back to a specific table assignment.

### `upload_batches`

Represents one guest submission. This table stores the guest name, QR relation, anonymous auth user, status, and device/browser context.

### `photos`

Stores one row per uploaded file and points to the private object path in Supabase Storage.

## Credentials Needed Right Now

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Optional Later Credentials

- `SUPABASE_PROJECT_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TURNSTILE_SECRET_KEY`

Those later credentials are only needed if you decide to harden the system further with Edge Functions, signed upload URLs, or anti-bot checks.

## Operational Notes For The Wedding Day

- Upgrade Supabase to Pro a few days before the event, not the same day.
- Enable Anonymous Sign-Ins in Supabase Auth before testing the guest flow.
- Test uploads on at least two iPhones and two Android devices.
- Test with both Wi-Fi and cellular data.
- Keep the upload screen minimal and avoid any non-essential animations.
- Limit upload concurrency to reduce failures on weak networks.
