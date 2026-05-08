-- Migration: Initial Bitdash schema for Neon Postgres 17
-- Creates users, accounts, and settings needed by the app.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role varchar(20) NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_role_check CHECK (role IN ('user', 'superadmin'))
);

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  username text NOT NULL DEFAULT '',
  encrypted_password text NOT NULL DEFAULT '',
  encrypted_otp_secret text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accounts_user_created_at_idx
  ON accounts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key varchar(50) PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO settings (key, value)
VALUES ('registration_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
