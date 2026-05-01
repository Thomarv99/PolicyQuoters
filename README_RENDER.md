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
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check path | `/healthz` |
| Environment variable | `NODE_ENV=production` |

The included `render.yaml` can also be used as a Render Blueprint.

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
- This is still a client-rendered React app. For stronger SEO later, move the public website and broker directory pages to server-side rendering or prerendered static HTML.
