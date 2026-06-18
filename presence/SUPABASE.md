# Live-presence backend — Supabase Realtime (the no-CLI route)

Powers the village's "● N here now" counter + the dynamic population. Ephemeral
presence only — no tables, no stored data, no PII. ~5 minutes, all in the dashboard.

## What you do
1. Create a free Supabase account + project → https://supabase.com/dashboard (any region).
2. Realtime is on by default — nothing to configure, no tables needed.
3. Project **Settings → API**, copy:
   - **Project URL** — `https://<ref>.supabase.co`
   - **anon public key** — the key labeled "anon"/"public" (it's *designed* to be
     embedded in client code; not a secret).
4. **Send me both.** I set `SUPABASE_URL` + `SUPABASE_ANON` in the village and push →
   the counter goes live and the population starts scaling to the real headcount.

No CLI, no wrangler, no Durable Objects, no secret to manage. Free tier covers
Realtime presence for a small site.

## How it works / honesty
- Clients join a Realtime **presence** channel; the live count = unique connected
  browsers (a per-browser key dedupes your own tabs). Labeled "here now" — real,
  never invented.
- `supabase-js` loads on demand **only when configured**, so the village stays a
  self-contained static page otherwise.
- Turn it off anytime: clear the two values (or pause the Supabase project). The
  village degrades cleanly to its per-session populate-and-cap.
