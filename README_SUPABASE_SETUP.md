Supabase & Backend Setup
=========================

1) Create a Supabase project and open the SQL editor.

2) Run the SQL in `supabase_migrations.sql` to create the required tables:
   - `users` — stores minimal user records (email, role)
   - `otps` — stores one-time codes with expiry and used flag
   - `locations` — stores GPS location history

3) Get the following values from your Supabase project and set them in `.env.local`:
   - `SUPABASE_URL` (project URL)
   - `SUPABASE_SERVICE_KEY` (service_role key — keep private; used here server-side)

4) SMTP (Nodemailer): set these in `.env.local` for sending OTP emails:
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

5) Google Maps: set `GOOGLE_MAPS_API_KEY` in `.env.local` if you choose to use Google tiles or the JS SDK.

6) Local dev
   - Install deps: `npm install`
   - Start dev server: `npm run dev`

Redis
-----
- For production rate-limiting and counters, use Redis. Set `REDIS_URL` in `.env.local`.
- Install Redis client: `npm install ioredis`

Realtime
--------
- Supabase Realtime is used in the admin dashboard. Ensure you have Realtime enabled in your Supabase project.

Install additional packages
---------------------------
- Nodemailer (already used server-side) — ensure `nodemailer` is installed.
- ioredis: `npm install ioredis`

Performance / Long compile fix
------------------------------
- Use dynamic imports for heavy client-only libraries (the map is now dynamically imported) to reduce initial compilation and server-side bundling.
- Keep large images in `public/` and reference them directly (already done for backgrounds).
- Consider enabling Turbopack (Next.js 13+ uses it by default) and upgrading dependencies where applicable.

7) Test OTP flow
   - POST `/api/otp/send` with `{ email }`.
   - Check email for OTP (or find the OTP in dev response if `NODE_ENV=development`).
   - POST `/api/otp/verify` with `{ email, otp }`.

Security notes
--------------
- Use the Supabase `service_role` key only in server-side code.
- In production, consider enabling Row Level Security (RLS) and appropriate policies.
- Rate-limit the OTP send endpoint to prevent abuse.

Improvements & Next Steps
-------------------------
- Realtime: use Supabase Realtime or WebSocket server to broadcast live location updates to admin/clients.
- Map provider: optionally switch to Google Maps JS SDK for richer features (routes, directions) — you'll need the API key and billing enabled.
- Clustering & performance: cluster markers and paginate location queries; store only sampling; compress uploads from drivers.
- Mobile: provide a lightweight PWA or native wrapper for drivers to get better geolocation accuracy and background tracking.
