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
| Environment variables | `NODE_ENV=production`, `VITE_ASSET_BASE=/` (plus the Hexure / Supabase vars below if you want live data) |

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

The server uses Postgres-backed persistence (Supabase compatible) when `DATABASE_URL` is set. Landing pages, quote submissions, selected quotes (leads), the agent directory, the primary agent profile, and agent cases are all stored in Postgres. When `DATABASE_URL` is missing, the server falls back to an in-process in-memory store (suitable for local development only — data is lost on every restart).

On startup the server logs one of:

```text
[persistence] Postgres-backed persistence enabled (Supabase-compatible).
[persistence] DATABASE_URL is not set. Using in-memory prototype storage. ...
```

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

### GetEmails (GE) visitor capture

A GetEmails (GE) visitor-identification / contact-enrichment script is embedded **globally** in the HTML head (`client/index.html`) with account key **`R18HJ289`**. It loads on every page, including the landing page funnel (`/lp/:slug`), and runs client-side from `s3-us-west-2.amazonaws.com/jsstore/a/R18HJ289/ge.js`.

- The snippet self-guards against duplicate inclusion (`geq.invoked`), so it is safe even if a page mounts/unmounts repeatedly.
- It is not gated by an env var; the account key is hardcoded in the head. To change keys or remove the tool, edit `client/index.html`.
- Because this tool can capture/enrich visitor contact information, keep the **Privacy Policy** (`/privacy-policy`) aligned with the visitor-identification, contact-enrichment, and analytics tools actually deployed. If you add, remove, or swap tracking tools, update the policy's cookies/analytics and third-party sections and the opt-out language accordingly.

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
