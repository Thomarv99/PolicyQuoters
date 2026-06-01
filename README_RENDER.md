# PolicyQuoters Render Deployment

This app is ready to run as a Render Web Service with a custom domain.

## 1. Push the project to GitHub

Render deploys from a Git repository. Push this project to a GitHub repo, then connect that repo from the Render dashboard.

## 2. Create the Render service

In Render:

1. Choose **New +** → **Web Service**.
2. Connect the PolicyQuoters GitHub repository.
3. Use these settings:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Health check path | `/healthz` |
| Environment variables | `NODE_ENV=production`, `VITE_ASSET_BASE=/`, `VITE_GA_MEASUREMENT_ID=G-R5NXRQVS7Z` (plus the Hexure / Supabase vars below if you want live data) |

The included `render.yaml` can also be used as a Render Blueprint.

### Hexure Sandbox Quoting API (optional in MVP)

The landing-page quote endpoint calls Hexure when these are set, and falls back to in-memory sandbox quotes filtered by each landing page's carriers otherwise. Add these in Render → **Environment** when you are ready to flip from mock to real quotes.

| Variable | Required | Notes |
| --- | --- | --- |
| `HEXURE_API_BASE_URL` | Yes (for live quotes) | e.g. `https://sandbox.hexure.com/api/v1` |
| `HEXURE_API_KEY` | Yes (for live quotes) | Issued by Hexure for the sandbox account |
| `HEXURE_ACCOUNT_ID` | Optional | Sent as `X-Hexure-Account` header if present |
| `HEXURE_ENV` | Optional | `sandbox` (default) or `production` |

When neither base URL nor key is set, the server logs `[hexure] ...` warnings and uses the built-in mock generator, so the funnel stays usable for ad-traffic testing today.

### Production persistence (Supabase Postgres)

> ⚠️ **CRITICAL — Render must have a working `DATABASE_URL`.** In production the server now **refuses to start** unless it can connect to Postgres. If `DATABASE_URL` is missing, invalid, or unreachable, the deploy will **fail fast and crash** (visible in the Render logs and the `/healthz` check) instead of silently serving on volatile in-memory storage. This is intentional: the previous behavior silently fell back to memory and **wiped landing pages, leads, and captured contacts on every redeploy**.
>
> - Use a **working Supabase/Postgres `DATABASE_URL`**. Prefer the **Supabase Session Pooler** (`...pooler.supabase.com:5432`) with **`sslmode=require`**.
> - **A manual redeploy is required after changing any environment variable** in Render — env var edits do not take effect until you trigger a redeploy.
> - **Data created while the memory fallback was active cannot be recovered after a redeploy.** It was never written to a database. There is no backup to restore. Recreate those landing pages once persistence is healthy.

The server uses Postgres-backed persistence (Supabase compatible) when `DATABASE_URL` is set. Landing pages, quote submissions, selected quotes (leads), the agent directory, the primary agent profile, and agent cases are all stored in Postgres. In **development only**, when `DATABASE_URL` is missing the server falls back to an in-process in-memory store (data is lost on every restart). This fallback is **disabled in production** by the startup guard above.

On startup the server logs one of:

```text
[persistence] Postgres-backed persistence enabled (Supabase-compatible).
[persistence] DATABASE_URL is not set. Using in-memory prototype storage. ...        (development only)
[persistence] FATAL: DATABASE_URL is not set in production. Refusing to start ...     (production, crashes)
[persistence] FATAL: DATABASE_URL is set but Postgres initialization failed ...        (production, crashes)
```

If a database degrades **after** a successful boot, write endpoints for persistent data (landing pages, leads, captured-contact webhook, agent state) return HTTP `503` with `Database persistence is unavailable; changes are not being saved`, and the admin landing-page builder shows a prominent red banner and disables saving. `/healthz` returns `503` with `"status": "degraded"` in this state so Render and external monitors flag it.

#### Verifying persistence health

`GET /healthz` returns persistence diagnostics (no secrets):

```json
{ "status": "ok", "persistence": { "backend": "database", "databaseUrlConfigured": true, "databaseInitialized": true, "persistenceDegraded": false } }
```

A `backend` of `"memory"` or `persistenceDegraded: true` in production means data is **not** being saved — fix `DATABASE_URL` and redeploy.

Set the following in Render → **Environment**:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes (for production) | Supabase Postgres connection string. Use the URI from Supabase Dashboard → Project Settings → Database → Connection string. Replace `[YOUR-PASSWORD]` with the real database password. **Never commit this value.** For Render web services, the **Session pooler** URI (`...pooler.supabase.com:5432`) is recommended. |
| `DATABASE_POOL_MAX` | No | Defaults to `5`. Raise if you need more concurrent connections. |
| `DATABASE_SSL` | No | Defaults to TLS with `rejectUnauthorized=false` (required for Supabase). Set to `disable` only for a non-TLS local Postgres. |

Example shape of the Supabase connection string (do **not** paste real credentials into git):

```text
postgresql://postgres:<URL-ENCODED-PASSWORD>@db.<project-ref>.supabase.co:5432/postgres
# or, for the pooler (recommended for Render):
postgresql://postgres.<project-ref>:<URL-ENCODED-PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Tips:

- URL-encode any special characters in the password (e.g. `@` → `%40`).
- Add `DATABASE_URL` in the Render dashboard's **Environment** tab — not in `render.yaml`, since `render.yaml` is committed to git.
- The schema is created automatically on first boot (idempotent `CREATE TABLE IF NOT EXISTS`). No separate migration step is required for the MVP.

Optional Supabase client-SDK variables (used only if you also call Supabase from elsewhere — they are not required for persistence):

| Variable | Required |
| --- | --- |
| `SUPABASE_URL` | Optional |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional (server-side only) |
| `SUPABASE_ANON_KEY` | Optional (only if reading from client) |

### Meta Pixel tracking (optional)

The landing page funnel (`/lp/:slug`) emits Meta Pixel events for ad conversion tracking. Set the global Pixel ID in Render → **Environment**:

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_META_PIXEL_ID` | No | Numeric Meta Pixel ID (6-20 digits). When set, the Pixel script loads and emits `PageView`, `ViewContent`, `Lead`, `QuoteStarted`, `QuotesGenerated`, and `QuoteSelected` events on the landing page flow. When unset, all tracking calls are silent no-ops. |

Per-landing-page overrides are also available in the admin builder (`/admin/landing-pages`) under the **Meta Pixel ID** field. A page-level value overrides the global env var for that page only.

**Important:**

- `VITE_*` env vars are baked into the Vite client bundle at build time. Changing `VITE_META_PIXEL_ID` requires a **manual deploy / rebuild** on Render before it takes effect on the live site.
- **No PII is sent to Meta.** Tracking params are limited to non-identifying funnel signals (landing page slug, state, coverage tier, smoker flag, health class, gender, age range, carrier/product names on selection). Names, emails, phone numbers, addresses, and ZIP codes are **never** sent to Meta from the Pixel. If you later wire the Conversions API server-side, hash any user identifiers per Meta's spec.
- The utility is resilient: if `fbq` is blocked by an ad blocker, the Pixel ID is missing, or the script fails to load, the funnel continues to work normally with no console noise.
- Each tracked event gets a stable `event_id` for future Meta Conversions API deduplication.

### Google Analytics 4 tracking

GA4 (`gtag.js`) loads **globally** on every page — the public website, consumer quote flows (`/app`, `/quotes`), admin/agent pages, and landing pages (`/lp/:slug`). It is initialized once in `client/src/main.tsx` and the SPA router (`client/src/App.tsx`) sends a `page_view` on every route change (gtag's automatic page_view is disabled so single-page navigations are tracked accurately).

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_GA_MEASUREMENT_ID` | No | GA4 measurement ID (format `G-XXXXXXXXXX`). Defaults to `G-R5NXRQVS7Z` when unset. Set it in Render → **Environment** to override or disable via a different property. |

Set in Render:

```
VITE_GA_MEASUREMENT_ID=G-R5NXRQVS7Z
```

In addition to page views, the funnel emits these GA4 events (non-PII params only): `landing_page_viewed`, `quote_flow_started`, `quote_contact_submitted`, `quotes_generated`, `quote_selected`, and `lead_submitted_to_agent`.

**Important:**

- `VITE_*` env vars are baked into the Vite client bundle at build time. Changing `VITE_GA_MEASUREMENT_ID` requires a **manual deploy / rebuild** on Render before it takes effect on the live site.
- **No PII is sent to GA.** Event params are limited to non-identifying funnel signals (line type, state, coverage amount/tier, smoker flag, term length, carrier/product names, landing page slug/ID, premium figures). Names, emails, phone numbers, addresses, ZIP codes, and raw health details are **never** sent to GA.
- The utility is resilient: if `gtag` is blocked by an ad blocker, the measurement ID is missing/invalid, or the script fails to load, the funnel continues to work normally with no console noise.

### GetEmails (GE) visitor capture

A GetEmails (GE) visitor-identification / contact-enrichment script is embedded **globally** in the HTML head (`client/index.html`) with account key **`R18HJ289`**. It loads on every page, including the landing page funnel (`/lp/:slug`), and runs client-side from `s3-us-west-2.amazonaws.com/jsstore/a/R18HJ289/ge.js`.

- The snippet self-guards against duplicate inclusion (`geq.invoked`), so it is safe even if a page mounts/unmounts repeatedly.
- It is not gated by an env var; the account key is hardcoded in the head. To change keys or remove the tool, edit `client/index.html`.
- Because this tool can capture/enrich visitor contact information, keep the **Privacy Policy** (`/privacy-policy`) aligned with the visitor-identification, contact-enrichment, and analytics tools actually deployed. If you add, remove, or swap tracking tools, update the policy's cookies/analytics and third-party sections and the opt-out language accordingly.

#### Receiving GE data via the secure webhook

GetEmails can POST the contact details it captures to our own server through its **Connect Webhook** feature. The server exposes a secure receiver at `POST /api/webhooks/visitor-capture` that authenticates the request, stores the raw payload plus best-effort extracted fields (email, name, phone, page URL, referrer, UTM params, IP, user agent) in the `visitor_capture_events` table (in-memory fallback when `DATABASE_URL` is unset), and returns `202 { "ok": true, "id": "..." }`.

Configure these fields in the GetEmails **Connect Webhook** screen:

| Field | Value |
| --- | --- |
| **Webhook URL** | `https://www.policyquoters.com/api/webhooks/visitor-capture` |
| **Custom JSON Data** | `{ "source": "getemails", "site": "policyquoters", "account_key": "R18HJ289" }` |
| **Custom Headers (JSON format)** | `{ "X-PolicyQuoters-Webhook-Source": "getemails", "X-PolicyQuoters-Webhook-Secret": "YOUR_RANDOM_SECRET" }` |

Then set the matching secret in Render → **Environment**:

| Variable | Required | Notes |
| --- | --- | --- |
| `GETEMAILS_WEBHOOK_SECRET` | Yes (for production) | A long random string you generate (e.g. `openssl rand -hex 32`). The webhook only accepts requests whose `X-PolicyQuoters-Webhook-Secret` header **exactly matches** this value. In production, if this var is **missing**, the endpoint fails closed and returns `503` so we never run an open ingestion endpoint. In local/dev (non-production), a missing secret logs a warning and accepts the request. The secret is **never logged**. |

Authentication behavior:

- **Secret set + header matches** → `202 { ok: true, id }` and the event is stored.
- **Secret set + header missing/wrong** → `401`.
- **Secret missing in production** → `503` (fail closed).
- **Secret missing in non-production** → accepted with a warning (local dev convenience only).

View recent captured events (newest first) at:

```text
GET https://www.policyquoters.com/api/admin/visitor-capture-events?limit=100
```

Because this endpoint returns enriched contact data (email, name, phone, IP, etc.), it is **protected by an admin secret**. It is **not** publicly accessible: visiting the URL directly in a browser now returns `401 Unauthorized` because a browser cannot attach the required header. You must use a tool/client (curl, Postman, a script) that sends the `X-PolicyQuoters-Admin-Secret` header.

Set the admin secret in Render → **Environment**:

| Variable | Required | Notes |
| --- | --- | --- |
| `POLICYQUOTERS_ADMIN_API_SECRET` | Yes (for production) | A long random string you generate (e.g. `openssl rand -hex 32`). Keep it **different** from `GETEMAILS_WEBHOOK_SECRET`. The admin read endpoint only accepts requests whose `X-PolicyQuoters-Admin-Secret` header **exactly matches** this value. In production, if this var is **missing**, the endpoint fails closed and returns `503` so contact data is never served unauthenticated. In local/dev (non-production), a missing secret logs a warning and allows the request. The secret is **never logged**. |

Render environment value to add:

```text
POLICYQUOTERS_ADMIN_API_SECRET=YOUR_RANDOM_ADMIN_SECRET
```

To view events, send the matching header (shown as a JSON header object):

```json
{ "X-PolicyQuoters-Admin-Secret": "YOUR_RANDOM_ADMIN_SECRET" }
```

Example request:

```bash
curl -H "X-PolicyQuoters-Admin-Secret: YOUR_RANDOM_ADMIN_SECRET" \
  "https://www.policyquoters.com/api/admin/visitor-capture-events?limit=100"
```

Authentication behavior:

- **Secret set + header matches** → `200` with the events JSON.
- **Secret set + header missing/wrong** → `401`.
- **Secret missing in production** → `503` (fail closed).
- **Secret missing in non-production** → allowed with a warning (local dev convenience only).

#### Captured contacts admin page (UI)

Instead of using curl/Postman, admins can view captured contacts in the browser at:

```text
https://www.policyquoters.com/admin/captured-contacts
```

This page is reachable from the **Captured contacts** button in the headers of the routing console (`/admin`) and the landing-page builder (`/admin/landing-pages`). It works as follows:

- You **paste the admin API secret** into a password field on the page. The page sends it as the `X-PolicyQuoters-Admin-Secret` header when calling `GET /api/admin/visitor-capture-events`.
- The secret is held **in React state for the current session only**. It is **never** written to `localStorage`, `sessionStorage`, cookies, or the URL, and is cleared when you reload or leave the page. You must re-enter it each session.
- The API still requires the header, so **navigating directly to the API URL in a browser remains blocked** (`401`). The UI simply supplies the header on your behalf after you enter the secret.
- Features: client-side search/filter (email, name, source, page URL), a limit selector (25/50/100/250) that re-passes the `limit` query param, CSV export of the currently filtered rows (the export **excludes the secret** and only includes contact/attribution columns), and a detail drawer showing the **raw GE payload** for each event (GE field names can vary).
- Friendly **loading, empty, unauthorized, and error** states are included. On a `401`, the page tells you to verify the entered secret matches the server's `POLICYQUOTERS_ADMIN_API_SECRET`.

> Note: other `/api/admin/*` routes in this prototype (e.g. `/api/admin/leads`, consumed by the admin landing-pages UI) remain on the existing open-access pattern and are **not** gated by this secret, since the in-app admin UI does not yet send the header. Gate those behind real auth before exposing them broadly.

Security notes:

- Generate a unique random value for `GETEMAILS_WEBHOOK_SECRET`. **Do not paste the real secret into GitHub** (README, `render.yaml`, or code) — set it only in the Render dashboard and in the GetEmails Custom Headers field. The values shown above are placeholders.
- Generate a **separate** unique random value for `POLICYQUOTERS_ADMIN_API_SECRET` (do not reuse `GETEMAILS_WEBHOOK_SECRET`). Set it only in the Render dashboard, never in committed files. The values shown above are placeholders.
- Because this endpoint receives and stores enriched visitor contact details, keep the **Privacy Policy** (`/privacy-policy`) aligned with what is collected, stored, and shared.

#### Versium Contact Append enrichment

After a visitor-capture event is received and stored, the server automatically attempts to enrich the contact using the [Versium Contact Append API](https://api-documentation.versium.com/reference/contact-append-api). This appends data such as mobile/landline phone, email, and postal address from the contact's name/email/phone/address. The enrichment outcome (status, timestamps, error, and the raw Versium response) is saved on the event and shown on the captured-contacts admin page.

Enrichment runs **only when `VERSIUM_API_KEY` is set**. If it is missing, the event is still stored and the enrichment status is recorded as `skipped` (`not_configured`) — webhook ingestion is never affected. If Versium returns `401/429/5xx` or no match, the event is still stored with a `failure` or `no_match` status and a concise error message. The API key is **never logged**.

Set the Versium env vars in Render → **Environment**:

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `VERSIUM_API_KEY` | No (enrichment is optional) | _none_ | Your Versium API key. Sent as the case-sensitive `x-versium-api-Key` request header. When unset, enrichment is skipped. Set only in the Render dashboard — never commit it. |
| `VERSIUM_CONTACT_APPEND_OUTPUTS` | No | `phone_mobile,email,address` | Comma-separated `output[]` values. Allowed: `phone`, `phone_mobile`, `phone_multiple`, `phone_mobile_multiple`, `email`, `email_multiple`, `address`. Only **one** phone-type value is allowed per query — extra phone types are dropped automatically. |
| `VERSIUM_MATCH_TYPE` | No | `indiv` | `indiv` (individual) or `hhld` (household). |
| `VERSIUM_MAX_RECS` | No | `1` | Max records to return per query, clamped to `1`–`100` (`cfg_maxrecs`). |
| `VERSIUM_TIMEOUT_MS` | No | `9000` | Request timeout in milliseconds, clamped to `1000`–`30000`. The webhook still returns `202` if the call times out. |

Render environment values to add (example):

```text
VERSIUM_API_KEY=YOUR_VERSIUM_API_KEY
VERSIUM_CONTACT_APPEND_OUTPUTS=phone_mobile,email,address
VERSIUM_MATCH_TYPE=indiv
VERSIUM_MAX_RECS=1
VERSIUM_TIMEOUT_MS=9000
```

You can also re-run enrichment for a single event (e.g. after adding the key, or to retry a transient failure):

```bash
curl -X POST -H "X-PolicyQuoters-Admin-Secret: YOUR_RANDOM_ADMIN_SECRET" \
  "https://www.policyquoters.com/api/admin/visitor-capture-events/<EVENT_ID>/enrich"
```

The captured-contacts admin page also has a **Re-enrich** button in each contact's detail drawer.

> **Billing note:** Versium Contact Append calls may consume match credits / billable usage on your Versium account each time a query is sent (including manual re-enrichment). Configure `VERSIUM_*` only when you intend to incur that usage.

## 3. Add the custom domain

The current SEO metadata uses `https://www.policyquoters.com` as the canonical site URL.

Recommended setup:

1. In the Render service, open **Settings**.
2. Go to **Custom Domains**.
3. Add `www.policyquoters.com` first.
4. Let Render add and redirect the root domain automatically.

If you prefer the root domain (`policyquoters.com`) to be canonical, update the site metadata first and add the root domain in Render instead.

## 4. Configure DNS

After adding the custom domain, Render will show the target hostname for the service, usually something like:

```text
policyquoters.onrender.com
```

Set DNS records at your domain registrar:

| Host | Type | Value |
| --- | --- | --- |
| `www` | CNAME | Your Render hostname, for example `policyquoters.onrender.com` |
| `@` | ALIAS/ANAME | Your Render hostname, if your DNS provider supports ALIAS/ANAME/CNAME flattening |
| `@` | A | `216.24.57.1`, if your DNS provider does not support ALIAS/ANAME/CNAME flattening |

Remove any `AAAA` records while setting up Render DNS.

For Cloudflare, use CNAME records for both root and `www`, set them to DNS-only while verifying, and use SSL/TLS mode **Full**.

## 5. Verify and launch

1. Return to the Render service's **Custom Domains** section.
2. Click **Verify**.
3. Wait for DNS propagation and TLS certificate issuance.
4. Test these URLs:

```text
https://www.policyquoters.com/
https://www.policyquoters.com/quotes
https://www.policyquoters.com/directory
https://www.policyquoters.com/app
https://www.policyquoters.com/agent
https://www.policyquoters.com/admin
https://www.policyquoters.com/healthz
https://www.policyquoters.com/sitemap.xml
```

## 6. Search launch checklist

After the site is live:

1. Create or open Google Search Console for `https://www.policyquoters.com`.
2. Submit `https://www.policyquoters.com/sitemap.xml`.
3. Add Bing Webmaster Tools and submit the same sitemap.
4. Confirm the broker directory pages load with clean URLs.

## Notes

- The Express server already listens on `process.env.PORT` and host `0.0.0.0`, which Render requires for public web services.
- The app now uses clean browser URLs instead of hash URLs.
- `VITE_ASSET_BASE=/` makes production assets load correctly from nested clean URLs such as `/brokers/priya-shah-ca`.
- This is still a client-rendered React app. For stronger SEO later, move the public website and broker directory pages to server-side rendering or prerendered static HTML.
