# ChangeSlip (React / Next.js)

Free, self-hosted change-order slips for local service owners.  
Exact same UI as the original Flask version — now powered by **React + Next.js**.

- Create a change slip (customer, summary, amount in **Dollars**, optional email/phone/job ref/details)
- Share an unguessable public magic link
- Customer Accept or Decline on a mobile-friendly page
- Owner detail page with audit timeline
- Printable receipt for accepted slips

No signup. No license.

## Quick start (local)

```bash
npm install
cp .env.example .env
# edit .env — set BUSINESS_NAME, PUBLIC_BASE_URL (optional for local)
npm run dev
```

Open http://localhost:3000

Local development uses a file-based SQLite database (`./data/changeslip.db`) automatically.  
No Turso account is required for local work.

## Deploy to Vercel (recommended)

The app uses **@libsql/client**, which works on Vercel serverless when pointed at a Turso database (free tier is excellent).

### 1. Create a free Turso database

```bash
# Install Turso CLI: https://docs.turso.tech/cli/installation
turso auth login
turso db create changeslip
turso db show changeslip --url          # → TURSO_DATABASE_URL
turso db tokens create changeslip       # → TURSO_AUTH_TOKEN
```

### 2. Deploy

1. Push this folder to a GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new) → Import the repo.
3. Add the environment variables (see table below).
4. Deploy.

After deploy, set `PUBLIC_BASE_URL` to your Vercel URL (e.g. `https://changeslip.vercel.app`) and redeploy if needed.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TURSO_DATABASE_URL` | **Yes (prod)** | Turso database URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | **Yes (prod)** | Turso auth token |
| `PUBLIC_BASE_URL` | Recommended | Full public URL of the app (no trailing slash) |
| `BUSINESS_NAME` | Optional | Name shown on public change-order pages (default: ChangeSlip) |
| `OWNER_PASSWORD` | Optional | Password protecting the owner UI (currently unused in UI) |
| `DEFAULT_CURRENCY` | Optional | Default currency code (default: USD) |
| `REQUIRE_TYPED_NAME` | Optional | `true` to require customer to type name on Accept |
| `DATABASE_PATH` | Optional | Local SQLite path (dev only, ignored when Turso is set) |

### Why the old better-sqlite3 version failed on Vercel

Vercel serverless functions have an **ephemeral filesystem**.  
`better-sqlite3` is a native Node module that writes a local `.db` file — that file is wiped on every cold start / redeploy.  

`@libsql/client` talks to Turso over HTTP (or uses a local file only in development), so data persists permanently.

## Amount

The form asks for **Dollars** (e.g. `250.00`).  
Internally the value is stored as integer cents for accuracy.

## Project structure

```
src/
  app/
    page.tsx                 # list of slips
    new/page.tsx             # create form
    slips/[id]/page.tsx      # owner detail + timeline
    c/[token]/page.tsx       # public accept/decline page
    c/[token]/receipt/page.tsx
    layout.tsx
    globals.css
    not-found.tsx
  lib/db.ts                  # all database access (async)
  components/CopyButton.tsx
```
