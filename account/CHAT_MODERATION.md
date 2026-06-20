# xclusivexo village — server-enforced chat moderation relay (operator deploy)

You (operator) hold the Supabase creds and deploy the backend by hand. Fade ships only the client
code + the Edge Function (`supabase/functions/chat-relay/index.ts`) + the RLS SQL
(`account/migration_004_chat_moderation.sql`). **The service-role/secret key NEVER appears in client
or committed code** — it lives only in the Edge Function env, auto-injected by Supabase.

Project ref: `bhrwgygqpahtclwnrjmp`

This runbook supersedes the earlier "no cutover needed" version, which was **wrong**. See the next
section for why, then follow the safe-order cutover. Related: `account/PRIVACY_PROPOSAL.md` already
flagged that "Turning on Realtime Authorization is project-wide … The public realms must be given an
explicit allow rule *before* the switch is flipped, or they break." This is the chat-specific
execution of exactly that coordinated cutover.

---

## ⚠ Why a project-wide cutover is REQUIRED (the correction)

The earlier plan assumed per-channel `config:{ private:true }` on `chat:<realm>` would enforce
authorization while the project kept **"Allow public access" ON**. Verified against the **current
Supabase docs (June 2026)**, that is false:

- **"To enforce private channels you need to disable the 'Allow public access' setting in Realtime
  Settings."** — `docs/guides/realtime/authorization`.
- **Channel Restrictions is a PROJECT-WIDE binary mode** — *allow public channels* vs. *use only
  private channels with Realtime Authorization*. There is **no per-channel coexistence mode that
  enforces**. — `docs/guides/realtime/settings`.
- **The `private:false` same-name bypass** — with public access ON, a tampered client subscribes/sends
  to the **same topic name** `chat:<realm>` with `config:{ private:false }`. Realtime treats that as a
  **distinct PUBLIC channel** and the `realtime.messages` RLS deny is **never evaluated**. The
  attacker then broadcasts raw, unfiltered content to everyone listening on the public variant. —
  Supabase Discussion **#29334** ("Unauthorized access to private channels by setting `private:false`").

**Consequence:** keeping public access ON does NOT deliver server-enforced moderation. The cutover to
**private-only** is mandatory. And because the cutover is project-wide, it would break the public
`realm:<id>` channels (presence + DJ-sync 'club' + remote players) the instant it flips — **unless
the `realm:%` allow-policies exist first.** Hence the safe order below: allow-policies → chat policy →
function → flip → smoke-test, with the public worlds never broken.

**Blast radius of the flip:** every Realtime channel project-wide becomes authorization-checked.
Affected: the public `realm:<id>` presence (headcount + remote players), the `realm:<id>` 'club'
DJ-sync broadcast, any `village` lobby channel, and the new `chat:<id>` receive. Section 2 of the SQL
re-permits all of the `realm:%` ones (and 2e covers the `village` lobby if present); the chat read
policy covers `chat:%`. Nothing else in the project uses Realtime. Rollback = flip the switch back ON
(see step 7) — instantly restores prior behavior; the added policies stay harmless.

---

## 0. Pre-flight

- `supabase login`
- `supabase link --project-ref bhrwgygqpahtclwnrjmp`
- Dashboard → Realtime → Settings → **note the current Channel Restrictions value** (it is ON /
  "allow public" today). You will flip it to **private-only in step 6 — NOT before.**
- Confirm `CHAT_ENABLED = false` is still set in `gen_village_public.py` (chat stays dark until the
  whole sequence + smoke tests pass).
- **STRONGLY RECOMMENDED — prove the anon-private-subscribe assumption on a THROWAWAY project first**
  (see the boxed test below). The one unverified shape in this whole design is whether an
  **anon/publishable-key** client can SELECT-subscribe a **private** topic after `setAuth()`. The
  docs' authorization examples all grant to `authenticated`; granting to `anon` is plausible but not
  doc-confirmed. If anon cannot read a private topic, the ephemeral relay is **dead on arrival** and
  you must take the persisted fallback (section "Fallback"). **Decide this BEFORE wiring the live
  project.**

> ### Throwaway-project anon-private-subscribe test (do this FIRST)
> 1. Create a scratch Supabase project (or use a disposable one). Flip Channel Restrictions to
>    **private-only**.
> 2. In the SQL editor, add ONLY the chat read policy from `migration_004` section 3
>    (`village anon read chat broadcast`, granted to `anon, authenticated`).
> 3. In a browser with **only the scratch project's publishable/anon key**:
>    ```js
>    const sb = supabase.createClient(SCRATCH_URL, SCRATCH_PUBLISHABLE_KEY);
>    await sb.realtime.setAuth();                       // attach the anon token for private auth
>    const c = sb.channel('chat:test', { config:{ private:true } });
>    c.on('broadcast', { event:'chat' }, m => console.log('GOT', m.payload));
>    c.subscribe(s => console.log('sub status:', s));   // EXPECT: SUBSCRIBED, not an auth error
>    ```
>    - **PASS** = `sub status: SUBSCRIBED`. The ephemeral relay design is viable → proceed.
>    - **FAIL** = `CHANNEL_ERROR` / "You do not have permissions to read from this Topic" → anon
>      cannot read a private topic in this Realtime version. **Stop. Take the persisted Fallback.**
> 4. (Optional) From a server/curl with the scratch **service-role** key, POST a broadcast to
>    `chat:test` (see step 5 shape) and confirm the browser logs `GOT`. This proves the full relay
>    path end-to-end on the scratch project before you touch the live one.

---

## 1. Add the Edge Function

- The source is committed at `supabase/functions/chat-relay/index.ts`. It reads `SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY` from `Deno.env` (both auto-injected — **no manual secret set**). CORS
  is an **allowlist** (`https://xclusivexo.com`, `www`, and `http://127.0.0.1:8137` /
  `localhost:8137` for local dev) — it echoes the Origin only if allowlisted. OPTIONS preflight is
  handled.

## 2. Confirm the secret exists (no manual set required)

- `supabase secrets list` → you should see `SUPABASE_SERVICE_ROLE_KEY` (auto-injected). Only set
  extras if you later externalize the blocklist, e.g.
  `supabase secrets set CHAT_BLOCKLIST_EXTRA="..."`.
- **NEVER paste the service-role key into client code, git, or `supabase secrets set`** — it is
  injected automatically.

## 3. Deploy the function

- `supabase functions deploy chat-relay --project-ref bhrwgygqpahtclwnrjmp`
- Leave `verify_jwt` at its default (ON). `invoke()` auto-attaches the publishable/anon JWT, so legit
  clients pass. **Be honest about what this buys:** the anon JWT ships in every browser, so it is a
  weak floor, not real auth. The real gates are (a) the server-side filter, (b) the RLS INSERT deny on
  `chat:%`, and (c) the private-only enforcement after the cutover. The CORS allowlist removes
  arbitrary in-browser pages as an amplifier (it does not stop curl — only real auth would).

## 4. Apply the Realtime Authorization RLS — allow-policies + chat read (SAFE ORDER, step a+b)

Run `account/migration_004_chat_moderation.sql` in the SQL editor, in this order (the file is laid
out to be run top-to-bottom):

1. **Audit** (SQL section 1): run the `pg_policies` SELECT and READ it. Confirm NO pre-existing policy
   broadly grants anon/public **INSERT** on `realtime.messages` for `chat:%`. If one exists, scope or
   remove it first — it would defeat the design.
2. **Public-realm allow-policies** (SQL section 2, **ACTIVE/uncommented**): presence read+write and
   broadcast read+write on `realm:%`. These are **additive and a no-op while public access is still
   ON**, so applying them now is safe and is what keeps the public worlds alive after the flip. If the
   project still creates a `village` presence lobby, also uncomment 2e.
3. **Chat read policy** (SQL section 3): `village anon read chat broadcast` (SELECT to `anon,
   authenticated` on `chat:%`). Do **NOT** add any anon INSERT policy for `chat:%` — deny-by-default
   is what blocks direct broadcast.
4. **Verify** (SQL section 6): list the policies and confirm the expected set is present.

> At this point NOTHING has changed for users yet — public access is still ON, the policies are
> dormant, chat is still `CHAT_ENABLED = false`.

## 5. Smoke-test the RELAY end-to-end (WHILE still public, function deployed)

The relay's WRITE path works regardless of the project-wide setting (the service-role key bypasses
RLS), so test it now before the flip:

- Open two tabs on the live site subscribed to `chat:street` (the client calls
  `_sb.realtime.setAuth()` then `_sb.channel('chat:street',{config:{private:true}})`).
- Tab A — clean:
  `await _sb.functions.invoke('chat-relay',{ body:{ realm:'street', name:'t', text:'hello world', pid: presenceKey() } })`
  → tab B must RECEIVE "hello world", and the bubble floats over tab A's critter (pid echoed).
- Tab A — blocked **text**: `text:'f u c k'` → response `{ rejected:true, reason:'blocked' }`; tab B
  must NOT receive it.
- Tab A — blocked **name** (the new fix): `body:{ realm:'street', name:'n1gger', text:'hi' }` →
  `{ rejected:true, reason:'blocked' }`; tab B must NOT receive it. (Previously the name slipped
  through.)
- Tab A — homoglyph (the new fix): a slur written with Cyrillic/fullwidth look-alikes →
  `{ rejected:true, reason:'blocked' }`.
- Tab A — rate: two invokes within 1.2s → second returns `{ rejected:true, reason:'rate' }`.
- Tab A — bad input: `body:{ realm:'../etc', text:'x' }` → `{ rejected:true, reason:'bad_realm' }`;
  `body:{ realm:'street', text:123 }` → `{ rejected:true, reason:'bad_text' }`.
- CORS: from a page NOT on the allowlist (e.g. a random codepen), the browser blocks the invoke
  response (no `Access-Control-Allow-Origin`). From `xclusivexo.com` it works.

If tab B never receives the clean message, the **anon-private-subscribe** assumption failed on the
live project too → take the Fallback.

## 6. THE CUTOVER — flip Channel Restrictions to private-only (the only enforcing step)

Only after sections 4–5 pass:

- Dashboard → Realtime → Settings → Channel Restrictions → set to **use only private channels /
  disable "Allow public access"**.
- This is the project-wide flip. The `realm:%` allow-policies from step 4 keep the public worlds
  working; the chat read policy keeps chat-receive working.

## 7. Smoke-test AFTER the cutover (regression + the deny tests that now matter)

Immediately re-run, on the live site:

**Regression (must still work):**
- Join a public realm: live headcount updates, remote players render, the `club` DJ-sync still
  follows. (Section 2 policies.) If any breaks, FLIP THE SWITCH BACK ON (rollback) and re-check which
  `realm:%` policy is missing.
- Chat receive still works (tab B gets a relayed clean message). If you now see "You do not have
  permissions to read from this Topic" on subscribe, anon-read-of-private failed under enforcement →
  rollback and take the Fallback.

**Deny tests (these are what the old runbook never truly tested):**
- Direct anon broadcast on `chat:*` must FAIL:
  ```js
  const c = _sb.channel('chat:street', { config:{ private:true } });
  c.subscribe();
  await c.send({ type:'broadcast', event:'chat', payload:{ name:'evil', text:'raw bypass' } });
  ```
  A second subscribed tab must NOT receive "raw bypass".
- **The `private:false` same-name bypass must now be DENIED** (the whole point of the cutover):
  ```js
  const pub = _sb.channel('chat:street', { config:{ private:false } });
  pub.on('broadcast', { event:'chat' }, m => console.log('LEAK', m.payload));
  pub.subscribe(s => console.log('private:false sub:', s));   // EXPECT: error / not delivered
  await pub.send({ type:'broadcast', event:'chat', payload:{ name:'evil', text:'bypass' } });
  ```
  With private-only enforcement, the public same-name channel must be refused — a real private:true
  subscriber must NOT log "LEAK". (Before the cutover, this test LEAKS — that is precisely the hole
  the cutover closes.)

## 8. Go live

- Fade flips `CHAT_ENABLED = true` in `gen_village_public.py`, regenerates the static pages, runs
  `village_check.py` (expect exit 0). You publish to GitHub Pages. Chat is now server-enforced: bad
  content (in text AND name) is blocked before fan-out, and a tampered client cannot broadcast raw on
  `chat:<id>` (neither via private:true deny nor via the private:false same-name trick).

---

## Fallback — persisted DB relay (ONLY if anon cannot read a private topic)

If the throwaway-project test (or step 5/7) shows anon/publishable-key clients **cannot
SELECT-subscribe a private topic**, the ephemeral relay is not viable. Switch to the persisted path,
which touches NO project-wide setting and avoids this whole cutover:

1. `public.chat_messages(id, realm, pid, name, text, created_at)`.
2. A **BEFORE INSERT trigger** (`SECURITY DEFINER`, pinned `search_path`) runs the SAME
   normalization + blocklist on `name` and `text` server-side and either masks or `RAISE`s — so the
   row is filtered before it exists, regardless of the caller.
3. RLS: anon may **INSERT** (the trigger is the gate) and **SELECT** recent rows for a realm; anon may
   NOT UPDATE/DELETE. Public-realm channels are untouched (no project-wide flip).
4. Clients receive via **Postgres Changes** (`postgres_changes`, INSERT, filtered by realm) instead of
   broadcast.
- COST (state it honestly): chat becomes **persisted, not ephemeral** — a storage + retention surface
  that MUST be named in the privacy notice (`account/PRIVACY_PROPOSAL.md`). You gain a moderation
  audit trail and after-the-fact redaction; you pay storage + a retention job. Sub-second latency.

---

## Honest residuals the operator must know

1. **Identity / name-spoofing — there are no accounts.** The relay accepts whatever `name` the client
   sends and can only key the rate-limit on the anon JWT `sub` (shared across anon sessions) or a
   name+realm fallback. A tampered client can impersonate any display name and rotate identity to
   evade local mutes. The relay closes the **raw-content** bypass and now also filters the **name**
   field — but it does NOT establish authenticated identity. True identity + durable bans require
   Supabase Auth (even anonymous sign-in) so the relay/RLS can key on `auth.uid()`. Same limit
   `PRIVACY_PROPOSAL.md` already states ("Private rooms require an account … no identity to check").
2. **Blocklist is a FLOOR, not an LLM moderator.** Normalization now folds NFKC + zero-width/combining
   marks + common homoglyphs + leet + run-collapse + space-strip, so it catches far more than the
   ASCII-only version — but it still misses novel evasion, context-dependent harassment, sarcasm, and
   non-English. The relay is the right place to later swap in an AI/Perspective moderation call with
   zero client change; until then it is necessary-not-sufficient and needs a maintained list.
3. **Rate limit is best-effort in-memory.** It lives in ONE warm isolate, resets on cold start, and is
   per-instance — NOT a hard cross-instance limit. A flooder exploiting instance churn can exceed it.
   Durable limiting needs a Postgres atomic counter (an RPC the relay calls) or Redis keyed on
   sub+realm, plus a per-realm ceiling — that breaks strict ephemerality, so it is the documented
   upgrade path, not built.
4. **Chat read scope is the whole `chat:%` namespace.** Any anon can subscribe to any `chat:<id>`,
   including a private link-space's chat. So a private link-space's chat is only as private as its
   **unguessable id** — "unlisted", not "members-only". For real isolation, use the commented
   membership-scoped read policy (SQL section 5) once clients carry an auth token. State this plainly
   in any "private space" UI.
5. **Latency + cold start.** Each message is now an HTTPS round-trip to the function + a REST broadcast
   (~100–400 ms warm; ~1–2 s on a cold start) instead of a direct websocket send. Fine for human chat
   cadence; noticeable on the first message after idle.
6. **Service-role blast radius.** The secret key has full BYPASSRLS access and lives only in the
   function env. The function uses it for exactly one broadcast fetch, never logs it, never reflects
   request data into another privileged call. A function bug that leaked it would be catastrophic —
   consider a scoped key if/when Supabase offers per-capability keys.
7. **Not executed against the live project.** Every API shape here is grounded against the current
   Supabase docs (the project-wide enforcement requirement, the `private:false` #29334 bypass, the
   broadcast REST batch body/headers, RLS by topic+extension only, service_role BYPASSRLS). The
   deploy-step smoke tests are the live proof and have NOT been run — run them, in order.
