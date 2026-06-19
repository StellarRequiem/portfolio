# PRIVACY_PROPOSAL.md — Account privacy & RLS for xclusivexo

**Status: DESIGN PROPOSAL. Nothing here has been applied to the live database.**
Reviewed against the running code (the village client `gen_village_public.py`, the
creator/room editors) — not against a summary. Run the draft migration on a
throwaway Supabase project first, prove the channel gate, then apply by hand.

## The goal in one sentence

Move "private" rooms and creations from **obscurity** (a hard-to-guess link or a
passphrase) to **server-enforced privacy** (the database decides who gets in),
while keeping the site static (GitHub Pages), shipping only the public
"publishable" key to the browser, and not breaking the existing public worlds.

## The one fact that drives everything

There are **two different locks** in Supabase, and they protect different things:

| Lock | What it protects | Where it lives |
|---|---|---|
| **Table RLS** (Row-Level Security) | Which database **rows** you can read/write | Policies on `creations`, `spaces`, `share_grants` |
| **Realtime Authorization** | Who can **join a live room** (a presence channel) | Policies on the `realtime.messages` table |

**Table RLS does NOT decide who can join a live room.** Today the village joins
rooms with the public key and no login (`gen_village_public.py` line 627: a plain
`createClient` with the anon key; topics `realm:<id>` at lines 636/639; zero auth
calls in the whole file). So **anyone holding the public key can join any room
topic** — no amount of `creations`/`spaces` table rules changes that. A room is
only **truly private** once we turn on Realtime Authorization and add a join
policy. Saying otherwise would be the exact overclaim to avoid.

## The three options considered

**Option A — "rooms / members."** A dedicated `space_members` table is the single
source of truth, consulted by both the room row rules and the join gate; creations
get a separate `creation_grants` table. Thorough on rooms; **most tables**.

**Option B — "allowlist / friends."** One directed "who-allows-whom" graph
(`relationships`) drives everything: a creations "friends-only" tier, room
membership, and the join gate, all from `is_mutual(you, owner)`. Elegant and
matches the roadmap's follows direction, but it makes private rooms depend on a
**friend graph that may not exist yet**, and forces login for private rooms.

**Option C — "grants" (RECOMMENDED, as a hybrid).** One capability table,
`share_grants`, answers both "can this person read creation X?" and "can this
person join room Y?". Grants are written only through an **owner-checked** server
function, so a client can never grant itself access. **Fewest tables, strongest
default-deny.**

## Recommendation: Option C, with two borrowings

Anchor on **C** because it is the simplest mechanism that covers both needs with
the safest default. Borrow from the others where it costs nothing:

- From **A**: keep **two clearly separate room namespaces** — `space:<id>` for
  account-private rooms, `realm:<id>` for public/passphrase rooms — so turning on
  Realtime Authorization (which is project-wide) doesn't break the public worlds.
- From **B**: offer the non-enumerable **"friends-only" creations tier** as an
  *optional* add-on (left commented in the migration), so a friend graph can be
  added later without being load-bearing now.

Why C over A and B, scored on the brief's axes:

- **Simplicity** — All three need the *same* two hard pieces (a `spaces` table +
  Realtime Authorization); that cost is identical. C wins on the part that
  differs: **one** `share_grants` table and **one** grant function instead of A's
  two tables or B's social graph.
- **Safety** — `share_grants` has **no direct insert rule at all**; the only way
  to create a grant is the owner-checked function, so a browser holding the public
  key cannot self-grant. The by-id creation fetch **requires the id** (not
  enumerable), exactly as the schema comment recommends, and does **not**
  re-introduce the leaky filter that migration_002 removed. Every server function
  pins its search path (privilege-escalation guard).
- **Fit** — The creator/room editors are **already logged in** and already write
  `creations` under the user's session (`gen_creator.py:221/231`,
  `gen_room.py:276/286`), so adding the share function is nearly free. Public
  realms keep their existing open topics, so the 10 public worlds and the live
  "● N here now" counter are untouched.

## What gets built (server side)

1. `public.spaces` — a real row for an account-private room (owner, name, world
   seed, `privacy` = `private` or `unlisted`). The id is server-minted, **not**
   derived from a passphrase.
2. `public.share_grants` — the one capability table, reused for creations and
   spaces.
3. Server functions: `fetch_creation(id)` (the by-id, non-enumerable invite-link
   fetch), `grant_share(...)` / `grant_share_by_handle(...)` (owner-checked),
   revoke via a normal delete.
4. `realtime.messages` policies — the actual join gate for `space:` rooms, plus an
   explicit allow for the public `realm:` rooms so they survive the project-wide
   switch.

## What gets wired (client side) — publishable key only, no secrets

**Creations (low cost — already authenticated):**
- Replace any future "open a creation by id" read with a call to
  `fetch_creation(id)` — the by-id invite-link path. The existing self-contained
  `#c=`/`#r=` links keep working unchanged.
- Add a "Share with @handle" control → `grant_share_by_handle('creation', id,
  handle)`. Revoke → delete the grant row.

**Rooms (the real work — net-new auth wiring in `gen_village_public.py`):**
- Get a login token: reuse the signed-in session, or (only if you want guest
  access) call `signInAnonymously()`. Then `supabase.realtime.setAuth(token)` so
  the live socket carries the user.
- For an account-private room: create it via an insert into `spaces`, invite with
  `grant_share('space', spaceId, grantee, 'join')`, and **join with**
  `channel('space:'+id, { config: { private: true, presence: {...} } })`.
- Leave the public realms exactly as they are: topic stays `realm:<id>`, no
  `private` flag — so public ambient play and live counts are untouched.

## What this guarantees — and what it does NOT

**Guaranteed once the migration + the dashboard steps are live and verified:**
- A non-member's attempt to join a `space:` private room is **rejected by the
  server**, not merely hidden behind a hard-to-guess id.
- A creation's private/unlisted rows are not enumerable; an unlisted creation is
  readable only by someone who holds its id (the link) or an explicit grant.
- Grants cannot be self-issued; only a resource's owner can grant access.
- No secret key ever ships to the browser — everything rides the public key plus
  the logged-in user's token.

**NOT guaranteed (state these honestly in the UI):**
- **Table rules alone do nothing for room joins.** Until Realtime Authorization is
  turned on (a project-wide dashboard switch) and the join policy is live and
  tested, a "private room" is still just an unlisted link + passphrase — obscurity.
- **Private rooms require an account (a login token).** A logged-out visitor has
  no identity to check. If you want guests in private rooms, you must enable
  anonymous sign-ins, which turns "no login" into a silent login.
- **Revocation is "can't re-join," not "instant kick."** A removed member stays
  connected until their socket reconnects or their token expires. Treat removal as
  "can't get back in," and use short token lifetimes for prompt eviction.
- **Within a room, everyone sees everyone.** Privacy is at the door (the join), not
  per-field; every member sees every other member's avatar and position.
- **Turning on Realtime Authorization is project-wide.** The public realms must be
  given an explicit allow rule *before* the switch is flipped, or they break. This
  is a coordinated cutover, not a purely additive change.

## Before any of this is called "private"

Run the migration on a throwaway Supabase project and confirm, against the running
project (not asserted): a logged-out or non-invited session gets a **join error**
on a `space:` room, and an invited one joins. That observed result is the bar.
None of this has been run against the live database.