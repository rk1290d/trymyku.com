# Deploying the new trymyku.com (Next.js on Vercel)

The old static site (repo root) stays live on GitHub Pages until the DNS cutover
at the end of this runbook. Nothing breaks in between.

## 1. Create the Vercel project (one time, ~5 minutes)

1. Go to [vercel.com](https://vercel.com) → sign up / log in **with GitHub** (free Hobby plan).
2. **Add New → Project** → import `rk1290d/trymyku.com`.
3. On the configure screen set:
   - **Root Directory**: `web`  ← the only setting that matters
   - Framework Preset: Next.js (auto-detected)
   - No environment variables needed (the site ships with the public Supabase URL + publishable key; env vars can override later if we ever rotate keys).
4. Click **Deploy**. You get a URL like `trymyku-com.vercel.app`.

## 2. Smoke-test the Vercel URL before touching DNS

- `https://<project>.vercel.app/` — home renders, App Store badges work
- `/fort-nite` — the seeded demo profile renders
- Paste `/fort-nite` into a Messenger/iMessage draft — big preview card appears
- `/stats` — passphrase gate loads
- Submit a quote request on `/fort-nite` — check `profile_leads` in Supabase

## 3. Point the domain at Vercel

In the Vercel project → **Settings → Domains** → add `trymyku.com` and
`www.trymyku.com`. Vercel will show the records it wants; they match below.

Then in **Namecheap → Domain List → trymyku.com → Advanced DNS**:

| Action | Type | Host | Value |
|---|---|---|---|
| **Change** | A | `@` | `76.76.21.21` (replaces the four GitHub Pages `185.199.x.x` A records) |
| **Change** | CNAME | `www` | `cname.vercel-dns.com` (replaces `rk1290d.github.io`) |

### DO NOT TOUCH (email lives here; the domain was suspended once already)

- All **MX** records (ForwardEmail: `mx1.forwardemail.net`, `mx2.forwardemail.net`, etc.)
- All **TXT** records (SPF, Resend DKIM, forwardemail verification, any ICANN/registrar records)

Only the `@` A records and the `www` CNAME change. Nothing else.

## 4. After propagation (minutes to a few hours)

- `https://trymyku.com/fort-nite` works with a valid certificate (Vercel issues it automatically).
- Send `trymyku.com/fort-nite` to yourself in a text: the large preview card is the pass signal.
- Optional cleanup: in the GitHub repo → Settings → Pages → set Source to **None**
  (the old static files stay in the repo root for rollback either way).

## Rollback (if anything looks wrong)

Put the old records back in Namecheap and the static site is live again:

- A `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- CNAME `www` → `rk1290d.github.io`

## Ongoing

- Every push to `main` that touches `web/` auto-deploys to production.
- Publishing a mechanic: set `slug` and `web_status='published'` on their
  `mechanic_profiles` row (the app-side claim flow will do this later).
  `unclaimed` = reachable by direct link only, noindex, claim banner shown.
  `draft` = invisible.
- Public pages read only the `web_*` views. Never point web code at base tables.
