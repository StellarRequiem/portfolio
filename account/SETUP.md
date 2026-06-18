# Accounts setup — Supabase Auth (GitHub OAuth), no passwords

Stands up sign-in + profiles + saved creations for xclusivexo.com, to the standard:
OAuth-only (no passwords stored), private-by-default, RLS-enforced. All dashboard + one SQL paste.

## Prereqs
The same Supabase project as the presence counter ([../presence/SUPABASE.md](../presence/SUPABASE.md)).
Have its **Project URL** + **anon public key** ready.

## Steps
1. **Run the schema.** Supabase dashboard → **SQL Editor** → New query → paste all of
   [`schema.sql`](./schema.sql) → **Run**. (Creates `profiles` + `creations` with RLS + the
   auto-profile trigger.)
2. **Create a GitHub OAuth app** (no password storage on our side):
   - github.com → Settings → Developer settings → **OAuth Apps** → **New OAuth App**
   - Homepage URL: `https://xclusivexo.com`
   - **Authorization callback URL:** `https://<your-ref>.supabase.co/auth/v1/callback`
     (copy this exact callback from Supabase → Authentication → Providers → GitHub)
   - Register → copy the **Client ID** + generate a **Client secret**
3. **Enable GitHub in Supabase:** dashboard → **Authentication → Providers → GitHub** →
   toggle on → paste the **Client ID** + **Client secret** → Save.
4. **Allowed redirect URLs:** Supabase → Authentication → URL Configuration → add
   `https://xclusivexo.com/account/` (and `http://localhost:8137/account/` for local testing).
5. **Send me the Project URL + anon key** → I wire `/account/` (and the presence counter) and
   we test sign-in together.

## What it gives you (this slice)
- **Sign in with GitHub** → a profile (pick a handle) → your **saved creations** list, with
  per-item **private / unlisted (invite link) / public** visibility.
- Next slice (after sign-in is verified live): "Save to my account" buttons in the critter
  creator + room composer, and cross-device sync.

## Notes / honesty
- The **anon key is public-safe** (RLS does the protecting); never share the `service_role` key.
- Public listings are gated by an `approved` flag (moderation) — default is unlisted/private.
- No passwords are ever stored (GitHub OAuth only). Minimal data: a handle + the GitHub email.
