# Architecture Overview

This document describes the intended product and technical architecture for WedSnap.

## Product Goal

Guests scan a QR code placed on their table, enter their name, and upload up to 10 photos per batch with the lowest possible friction.

Uploaded photos remain private. Guests cannot browse other uploads. Admins can review and download everything from a private panel.

## Core Flows

### Guest Upload Flow

1. Guest scans a table QR code.
2. The site opens `/upload?t=<token>`.
3. The frontend validates the token with a server-side endpoint or Edge Function.
4. The guest enters a name and selects up to 10 photos.
5. The client compresses images before upload.
6. The backend creates an `upload_batch`.
7. Signed upload URLs are created server-side.
8. Files are uploaded to the private `fotos-boda` bucket.
9. The backend registers each file in `photos`.

### Admin Flow

1. Admin signs in with Supabase Auth.
2. Admin opens a private dashboard.
3. The dashboard queries `upload_batches`, `photos`, and `qr_codes`.
4. Admin views, favorites, filters, and downloads photos.

## Security Model

- Guests do not create full user accounts.
- The storage bucket remains private.
- Guest uploads should happen through signed upload URLs generated server-side.
- Admin data access is protected by Supabase Auth plus RLS policies.
- Device and browser details are stored per upload batch for traceability.
- IP addresses should be stored as hashes, not raw values.

## Data Model

### `events`

Represents the wedding or future multi-event support.

### `admin_profiles`

Maps `auth.users` accounts to admin roles.

### `qr_codes`

Stores one token per table so uploads can be traced back to a specific area of the event.

### `upload_batches`

Represents one guest submission. This table stores the guest name, QR relation, status, and device/browser context.

### `photos`

Stores one row per uploaded file and points to the private object path in Supabase Storage.

## Recommended Deployment

- GitHub for source control
- Vercel for the frontend
- Supabase for database, auth, storage, and edge functions

## Operational Notes For The Wedding Day

- Upgrade Supabase to Pro a few days before the event, not the same day.
- Test uploads on at least two iPhones and two Android devices.
- Test with both Wi-Fi and cellular data.
- Keep the upload screen minimal and avoid any non-essential animations.
- Limit upload concurrency to reduce failures on weak networks.
