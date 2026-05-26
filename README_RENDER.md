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

### Production persistence (Supabase)

The MVP landing-page builder, consumer submissions, and lead/assignment records currently use an in-process in-memory store (see `server/landing-pages.ts`). For production on Render, swap to Supabase (or another managed database) using:

| Variable | Required |
| --- | --- |
| `SUPABASE_URL` | Yes (for production) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server-side only) |
| `SUPABASE_ANON_KEY` | Optional (only if reading from client) |

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
