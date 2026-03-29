-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_profiles (
  user_id uuid NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'admin'::text CHECK (role = ANY (ARRAY['admin'::text, 'owner'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT admin_profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT admin_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  event_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'fotos-boda'::text,
  storage_path text NOT NULL UNIQUE,
  original_filename text,
  mime_type text NOT NULL,
  file_extension text,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0),
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  captured_at timestamp with time zone,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::photo_status,
  is_favorite boolean NOT NULL DEFAULT false,
  sha256 text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT photos_pkey PRIMARY KEY (id),
  CONSTRAINT photos_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.upload_batches(id)
);
CREATE TABLE public.qr_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  table_label text NOT NULL,
  token text NOT NULL UNIQUE CHECK (char_length(token) >= 12),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  scan_count integer NOT NULL DEFAULT 0 CHECK (scan_count >= 0),
  last_scanned_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  table_number integer NOT NULL CHECK (table_number > 0),
  guest_group_name text,
  CONSTRAINT qr_codes_pkey PRIMARY KEY (id),
  CONSTRAINT qr_codes_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.upload_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  qr_code_id uuid NOT NULL,
  guest_name text NOT NULL CHECK (char_length(btrim(guest_name)) >= 1 AND char_length(btrim(guest_name)) <= 120),
  guest_session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status USER-DEFINED NOT NULL DEFAULT 'pending'::upload_batch_status,
  photo_count integer NOT NULL DEFAULT 0 CHECK (photo_count >= 0 AND photo_count <= 10),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at timestamp with time zone,
  user_agent_raw text,
  browser_name text,
  browser_version text,
  os_name text,
  os_version text,
  device_type text,
  device_vendor text,
  device_model text,
  screen_width integer CHECK (screen_width IS NULL OR screen_width > 0),
  screen_height integer CHECK (screen_height IS NULL OR screen_height > 0),
  pixel_ratio numeric CHECK (pixel_ratio IS NULL OR pixel_ratio > 0::numeric),
  language text,
  timezone text,
  network_type text,
  ip_hash text,
  referrer text,
  CONSTRAINT upload_batches_pkey PRIMARY KEY (id),
  CONSTRAINT upload_batches_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT upload_batches_qr_code_id_fkey FOREIGN KEY (qr_code_id) REFERENCES public.qr_codes(id)
);