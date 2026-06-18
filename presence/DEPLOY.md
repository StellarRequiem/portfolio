# Live-presence backend — deploy guide

A tiny Cloudflare Worker + Durable Object that powers the village's "● N here now"
counter and its dynamic population. **Ephemeral**: counts unique connected visitor
IPs, stores nothing, no accounts, no PII retained. ~5 minutes to deploy.

## What you do (the parts I can't — your account/deploy)
1. **Create a free Cloudflare account** → https://dash.cloudflare.com/sign-up
2. **Install Wrangler** (Cloudflare's CLI): `npm install -g wrangler`
3. **Log in**: `wrangler login` (opens the browser, authorize)
4. **Deploy**:
   ```sh
   cd ~/portfolio/presence
   wrangler deploy
   ```
5. **Copy the URL** it prints, e.g. `https://xclusivexo-presence.<your-subdomain>.workers.dev`
6. **Send me that URL** — I set the village's `PRESENCE_URL` to
   `wss://xclusivexo-presence.<your-subdomain>.workers.dev/presence` and push;
   the counter goes live.

No DNS change, no custom domain, no secret needed (it's a public read-only counter).
The site stays on GitHub Pages; only this counter talks to the Worker.

## Cost
Free tier covers a small site. Durable Objects are declared SQLite-backed so they're
free-tier eligible; if Cloudflare prompts for the Workers **Paid** plan, it's a flat
**$5/mo** (your call — flagged in the roadmap). No per-request surprise at this scale.

## Verify after deploy
- `curl https://xclusivexo-presence.<sub>.workers.dev/presence` → `{"count":0}` (JSON snapshot).
- Open the village in two tabs once I've wired the URL → the counter shows `● 1 here now`
  (unique IPs, so your own two tabs count as one person).

## Honesty / scope
- The count is **live connections by unique IP ≈ people** — shared networks merge, a
  VPN-hopper splits; labeled "here now," not an exact human headcount.
- Allowed origins are locked to xclusivexo.com (+ localhost for testing) in `worker.js`.
- To take it down: `wrangler delete`. The village degrades cleanly to its per-session
  population (no counter) if the Worker is gone.
