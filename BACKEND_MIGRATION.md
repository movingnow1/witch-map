# Better Auth + MongoDB + Cloudflare migration

The current browser application stores demo data in `localStorage`; it does not currently call Supabase.

## Target split

- Better Auth: email/password and OAuth sessions, mounted at `/api/auth/*`.
- MongoDB Atlas: users/auth adapter data plus places, votes, reviews, coupons and reservations.
- Cloudflare R2: store and menu images; Cloudflare DNS/CDN may front the API.
- Vercel: keep hosting the static web app, or move the API to a Cloudflare Worker after driver compatibility is verified.

## Environments

Use independent secrets, databases and buckets:

- `dev`: `witchmap_dev`, preview/local origin, `witchmap-dev-media`.
- `prd`: `witchmap_prd`, production origin, `witchmap-prd-media`.

Never put `BETTER_AUTH_SECRET`, `MONGODB_URI` or R2 secret keys in browser JavaScript. Configure them only in the API runtime's secret/environment settings.

## Safe cutover

1. Create the server API and Better Auth handler.
2. Create MongoDB collections and indexes for app data.
3. Add authenticated CRUD endpoints and R2 signed uploads.
4. Import any real data. Browser `localStorage` demo accounts cannot be securely migrated as production credentials.
5. Point `app-config.js` API URLs at the dev API and test.
6. Configure separate production secrets and switch production only after dev passes.
