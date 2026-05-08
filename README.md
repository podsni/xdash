# Bitdash (OTP Vault)

Bitdash is a Next.js app for storing service credentials (password + optional OTP secret) securely per user.
Credentials are stored encrypted in Postgres and decrypted only for the logged-in user.

## Features

- Email/password auth with httpOnly session cookie
- Encrypted at-rest storage for `password` and `otp_secret`
- OTP display UI (TOTP) per saved account
- Admin panel (superadmin) for user management and global settings
- Superadmin vault oversight with audited secret reveal and cross-user item management
- Admin audit log for sensitive actions
- Registration can be enabled/disabled via DB settings

## Tech Stack

- Next.js (App Router)
- Postgres (`pg`)
- `bcryptjs` for password hashing
- `jose` for session JWT
- shadcn/ui components

## Requirements

- Node.js + npm
- Postgres database (local or hosted)

## Setup

1. Install dependencies

```bash
npm install
```

2. Create your env file

```bash
cp .env.example .env.local
```

3. Fill `.env.local`

- `DATABASE_URL`: Postgres connection string
- `ENCRYPTION_KEY`: **64 hex characters** (32 bytes). Generate:

```bash
openssl rand -hex 32
```

## Database Schema

Expected tables:

- `users` (`email`, `password_hash`, `role`)
- `accounts` (`user_id`, `service_name`, `username`, `encrypted_password`, `encrypted_otp_secret`, `website`, `icon`, timestamps)
- `settings` (`key`, `value`)
- `admin_audit_logs` (sensitive superadmin actions)

This repo ships SQL migrations in `migrations/`:

- `migrations/000_initial_schema.sql` (creates the initial Neon/Postgres schema)
- `migrations/001_add_role_column.sql` (legacy migration for older databases; includes a template to promote a user to `superadmin`)
- `migrations/002_create_settings_table.sql` (creates `settings` + default `registration_enabled`)
- `migrations/003_create_admin_audit_logs.sql` (creates the superadmin audit trail)

First setup flow:

1. Run the initial schema migration.
2. Keep registration enabled and create your first account from `/register`.
3. Promote that account to `superadmin` in Neon:

```sql
UPDATE users SET role = 'superadmin', updated_at = now() WHERE email = 'your-email@example.com';
```

4. Sign in and optionally disable registration from `/admin`.

## Development

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

Useful commands:

```bash
npm run lint
npm run build
npm start
```

## Routes

Pages:

- `/login` — login
- `/register` — register (only if enabled)
- `/` — accounts + OTPs
- `/settings` — change password / delete account
- `/admin` — superadmin panel

API:

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/auth/change-password`, `DELETE /api/auth/delete-account`
- `GET/POST /api/accounts`, `PUT/DELETE /api/accounts/:id`
- `GET/POST /api/settings`
- `GET/POST /api/users`, `GET/PUT/DELETE /api/users/:id` (superadmin only)
- `GET/POST /api/admin/users`, `PUT/DELETE /api/admin/users/:id` (audited superadmin user management)
- `GET /api/admin/users/:id/accounts`, `PUT/DELETE /api/admin/accounts/:id` (audited cross-user vault management)
- `POST /api/admin/accounts/:id/reveal` (audited on-demand secret reveal)
- `GET /api/admin/audit-logs`
- `GET /api/metadata?url=...` (requires login; blocks private hostnames)

## Security Notes

- Never commit `.env.local` (this repo ignores `.env*` and only commits `.env.example`).
- `ENCRYPTION_KEY` is required and is used for encryption and session signing; rotate it carefully (rotation invalidates sessions and makes old encrypted data unreadable unless you implement a migration).
- Account updates/deletes are scoped to the logged-in user (`user_id` ownership checks).
- Superadmin secret reveal is manual and written to `admin_audit_logs`; decrypted secrets are not shown in admin by default.
- API requests to protected routes return `401` JSON when unauthenticated (no HTML redirects).
