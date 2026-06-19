-- ============================================================================
-- ⚠️  OPERATOR: REVIEW + RUN BY HAND IN THE SUPABASE SQL EDITOR — NOT APPLIED ⚠️
-- ============================================================================
-- migration_003_privacy.sql  —  DESIGN PROPOSAL. Nothing here has been executed
-- against the live DB. Read every comment, run on a THROWAWAY Supabase project
-- first, prove the channel gate (see the VERIFY block at the end), THEN apply to
-- xclusivexo's project during a maintenance window.
--
-- WHAT THIS ADDS
--   1. public.spaces        — a real DB row for an ACCOUNT-PRIVATE room (today a
--                             "private space" is client-only: id='p'+hash(pass)).
--   2. public.share_grants  — ONE capability table reused for BOTH creation
--                             invite-links AND space membership.
--   3. SECURITY DEFINER RPCs — by-id unlisted creation fetch (the schema comment's
--                             recommendation, non-enumerable) + owner-checked
--                             grant/revoke + grant-by-handle.
--   4. realtime.messages RLS — the ONLY thing that gates who can JOIN a presence
--                             channel. Table RLS (1–3) does NOT do this.
--   5. (OPTIONAL, commented) a non-enumerable "allowlist" creations tier driven by
--                             a mutual-allow friends graph — enable later if wanted.
--
-- NON-SQL STEPS REQUIRED (cannot be done in this file — Dashboard actions):
--   [DASH-1] Auth → Providers → enable "Anonymous sign-ins" — ONLY if you want
--            logged-OUT guests to enter account-private rooms (they need a JWT to
--            carry auth.uid() into a private channel). If private rooms are
--            login-required, SKIP this. (See open_questions.)
--   [DASH-2] Realtime → Settings → turn OFF "Allow public access" (a.k.a. private
--            channels / Realtime Authorization). THIS IS PROJECT-WIDE. The moment
--            you flip it, EVERY channel needs an explicit allow policy or it
--            breaks — which is why section 4 adds an anon policy for the legacy
--            'realm:' realms BEFORE you flip it. Apply this SQL first, then flip.
--   [DASH-3] Verify the exact realtime.topic() return format + the presence vs
--            broadcast extension names on a throwaway project; this sketch assumes
--            topic() returns the bare topic string and extension in
--            ('presence','broadcast'). Confirm before trusting the gate.
--
-- HARD HONESTY (repeated because it is the trap the brief flags):
--   POSTGRES TABLE RLS GOVERNS ROWS. IT DOES NOT GOVERN WHO JOINS A REALTIME
--   PRESENCE CHANNEL. Sections 1–3 are necessary but NOT sufficient for "account-
--   private rooms." Only section 4 (RLS on realtime.messages = Realtime
--   Authorization) makes a room truly account-private. Until [DASH-2] + section 4
--   are live AND verified, a "private space" is exactly what the UI already
--   honestly says: an unlisted link + passphrase — obscurity, not enforcement.
--
-- This file is idempotent where Postgres allows (IF NOT EXISTS / CREATE OR REPLACE
-- / DROP POLICY IF EXISTS before CREATE POLICY) so a partial run can be re-run.
-- It does NOT weaken migration_002: the dropped enumerable "unlisted readable"
-- row-filter is NOT re-introduced; unlisted stays owner-only-in-table and is read
-- by-id only through the SECURITY DEFINER RPC.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) SPACES — server-of-record for an account-private room.
--    Public realms STAY client-side constants; only private rooms get a row.
--    id is a server-minted text id ('s_'+uuid), NOT derived from a passphrase,
--    so room access is decided by a grant, never by guessing the passphrase.
-- ----------------------------------------------------------------------------
create table if not exists public.spaces (
  id         text primary key default ('s_' || gen_random_uuid()::text),  -- server-minted; never a passphrase hash
  owner      uuid not null references auth.users(id) on delete cascade,    -- room creator; cascade so deleting an account cleans up
  name       text check (name is null or char_length(name) <= 40),         -- mirrors the creations name<=40 convention
  seed       int  not null,                                                -- snapshot of spaceSeed(id) so the world is server-authoritative + stable
  privacy    text not null default 'private'                               -- 'private' = grant-gated; 'unlisted' = anyone-with-the-id (link), no grant needed
             check (privacy in ('private','unlisted')),
  created_at timestamptz not null default now()
);
create index if not exists spaces_owner_idx on public.spaces(owner);        -- "my rooms" list is owner-scoped
alter table public.spaces enable row level security;                        -- deny-by-default; policies below are the ONLY read/write paths

-- owner has full control of own rows (create/rename/delete the room record)
drop policy if exists spaces_owner_all on public.spaces;
create policy spaces_owner_all on public.spaces for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

-- a grantee may READ the space row (needed to render name + seed). NOT a blanket
-- public SELECT — that would re-create the migration_002 enumerability leak.
-- The predicate requires a matching grant, so the row is invisible to non-members.
drop policy if exists spaces_grantee_read on public.spaces;
create policy spaces_grantee_read on public.spaces for select to authenticated
  using (exists (
    select 1 from public.share_grants g
    where g.resource_type = 'space' and g.resource_id = spaces.id
      and g.grantee = auth.uid()));

-- ----------------------------------------------------------------------------
-- 2) SHARE_GRANTS — the ONE capability mechanism, reused for both resources.
--    A row = "this grantee holds <scope> on this (type,id)". resource_id is text
--    so the same table holds a creation uuid AND a space text id.
--    SAFETY: there is deliberately NO direct INSERT policy. Granting is ONLY
--    possible through the owner-checked RPC in section 3b — a client holding the
--    publishable key cannot self-grant by inserting a row (RLS denies the insert).
-- ----------------------------------------------------------------------------
create table if not exists public.share_grants (
  resource_type text not null check (resource_type in ('creation','space')),  -- which kind of resource this grant is for
  resource_id   text not null,                                                -- creation uuid (as text) or space id
  grantee       uuid not null references auth.users(id) on delete cascade,    -- who receives access; cascade on account delete
  scope         text not null default 'read' check (scope in ('read','join','write')), -- 'read'=creation, 'join'=space presence, 'write'=future
  granted_by    uuid not null references auth.users(id) on delete cascade,    -- who issued it (must be the resource owner; enforced in RPC)
  created_at    timestamptz not null default now(),
  primary key (resource_type, resource_id, grantee)                          -- one grant per (resource, grantee); RPC upserts scope
);
create index if not exists share_grants_grantee_idx on public.share_grants(grantee);  -- hot path: realtime.messages gate + "what can I access" lookups
alter table public.share_grants enable row level security;

-- Visibility is intentionally narrow: you can see grants you HOLD or grants you
-- ISSUED. Never a blanket SELECT — the grant list is itself sensitive (it reveals
-- who has access to whom).
drop policy if exists sg_see_held on public.share_grants;
create policy sg_see_held on public.share_grants for select to authenticated
  using (grantee = auth.uid());
drop policy if exists sg_see_issued on public.share_grants;
create policy sg_see_issued on public.share_grants for select to authenticated
  using (granted_by = auth.uid());

-- NO INSERT policy on purpose (see section 3b). The owner may REVOKE grants they
-- issued (delete). A grantee may also remove their OWN grant ("leave"/decline).
drop policy if exists sg_revoke_issued on public.share_grants;
create policy sg_revoke_issued on public.share_grants for delete to authenticated
  using (granted_by = auth.uid());
drop policy if exists sg_self_leave on public.share_grants;
create policy sg_self_leave on public.share_grants for delete to authenticated
  using (grantee = auth.uid());

-- ----------------------------------------------------------------------------
-- 3a) BY-ID UNLISTED CREATION FETCH — the rpc the schema comment recommends.
--     REQUIRES the id (no listing, no enumeration). SECURITY DEFINER so it can
--     read past the owner-only table RLS, but it returns a row ONLY for the
--     legitimate paths. This is the "true invite link" for CREATIONS, and it does
--     NOT re-introduce the migration_002 enumerable row-filter (you must know id).
--     search_path pinned to public to block search-path privilege escalation.
-- ----------------------------------------------------------------------------
create or replace function public.fetch_creation(p_id uuid)
returns public.creations
language sql security definer set search_path = public stable as $$
  select c.* from public.creations c
  where c.id = p_id
    and (
         c.owner = auth.uid()                              -- the owner, always
      or (c.visibility = 'public' and c.approved)          -- listed (parity with the table's approved-public policy)
      or  c.visibility = 'unlisted'                        -- unlisted = anyone who holds the id (the link); never listed/enumerable
      or exists (                                          -- an explicit per-account grant
            select 1 from public.share_grants g
            where g.resource_type = 'creation' and g.resource_id = c.id::text
              and g.grantee = auth.uid() and g.scope in ('read','write'))
    )
  limit 1;
$$;
revoke all on function public.fetch_creation(uuid) from public, anon, authenticated;  -- reset, then grant narrowly
grant execute on function public.fetch_creation(uuid) to anon, authenticated;          -- anon may resolve a link too; the WHERE clause is the gate

-- 3b) GRANT — the ONLY way to write share_grants. Owner-checked, so a client
--     cannot grant itself access. Upserts scope so re-granting just updates it.
create or replace function public.grant_share(
  p_type text, p_resource_id text, p_grantee uuid, p_scope text default 'read')
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  -- look up the resource owner under definer rights (past RLS), then verify caller == owner
  if p_type = 'creation' then
    select owner into v_owner from public.creations where id = p_resource_id::uuid;
  elsif p_type = 'space' then
    select owner into v_owner from public.spaces where id = p_resource_id;
  else
    raise exception 'bad resource_type %', p_type;
  end if;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'not authorized to share this resource';  -- only the OWNER may grant
  end if;
  insert into public.share_grants(resource_type, resource_id, grantee, scope, granted_by)
  values (p_type, p_resource_id, p_grantee, p_scope, auth.uid())
  on conflict (resource_type, resource_id, grantee) do update set scope = excluded.scope;
end; $$;
revoke all on function public.grant_share(text,text,uuid,text) from public, anon, authenticated;
grant execute on function public.grant_share(text,text,uuid,text) to authenticated;  -- only logged-in owners grant

-- 3c) GRANT BY HANDLE — invite by @handle without the client ever handling uuids.
--     Resolves profiles.handle -> id, then defers to the owner-checked grant_share.
create or replace function public.grant_share_by_handle(
  p_type text, p_resource_id text, p_handle text, p_scope text default 'read')
returns void language plpgsql security definer set search_path = public as $$
declare v_grantee uuid;
begin
  select id into v_grantee from public.profiles where handle = lower(trim(p_handle));  -- normalize like the unique handle
  if v_grantee is null then raise exception 'no such handle'; end if;                  -- "valid handle or not" — no broader existence leak
  perform public.grant_share(p_type, p_resource_id, v_grantee, p_scope);               -- owner-check happens inside grant_share
end; $$;
revoke all on function public.grant_share_by_handle(text,text,text,text) from public, anon, authenticated;
grant execute on function public.grant_share_by_handle(text,text,text,text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4) THE LOAD-BEARING PART — gate who can JOIN a presence channel.
--    Postgres RLS above governs ROWS. Joining a presence topic is governed
--    SEPARATELY by RLS on realtime.messages, evaluated at WebSocket connect/join
--    under the user's JWT. WITHOUT this section, any publishable-key holder still
--    subscribes to any topic — sections 1–3 do NOTHING for channel joins.
--
--    PREREQ [DASH-2]: "Allow public access" OFF (project-wide). Apply THIS SQL
--    first so the legacy anon policy (rt_pub_realm_anon) exists before you flip.
--
--    TOPIC CONVENTION (two namespaces, on purpose):
--      'space:<spaces.id>'  -> ACCOUNT-PRIVATE room; client joins with private:true
--      'realm:<id>'         -> PUBLIC realm / legacy passphrase obscurity tier; open
--    Deriving the private topic from spaces.id server-side means a member can't be
--    tricked onto a foreign topic and topics aren't guessable into membership.
-- ----------------------------------------------------------------------------

-- realtime.messages is a Supabase-managed table; RLS is what Realtime
-- Authorization consults. Ensure it's on (Supabase enables it when you turn on
-- private channels; this is belt-and-suspenders and is idempotent).
alter table realtime.messages enable row level security;

-- PRIVATE SPACES — JOIN (subscribe / receive presence + broadcast). Passes iff
-- the topic is a 'space:<id>' the caller owns, holds a 'join' grant for, or the
-- space is 'unlisted' (anyone-with-the-link). authenticated only: a private room
-- requires auth.uid() — anon has none. (See [DASH-1] for the guest path.)
drop policy if exists rt_space_join on realtime.messages;
create policy rt_space_join on realtime.messages for select to authenticated using (
  realtime.messages.extension in ('presence','broadcast')
  and starts_with(realtime.topic(), 'space:')
  and exists (
    select 1 from public.spaces s
    left join public.share_grants g
      on g.resource_type = 'space' and g.resource_id = s.id
     and g.grantee = auth.uid() and g.scope = 'join'
    where s.id = substring(realtime.topic() from 7)        -- strip leading 'space:'
      and (s.owner = auth.uid()                            -- owner always joins
           or g.grantee is not null                        -- or holds a join grant
           or s.privacy = 'unlisted')                      -- or unlisted = anyone-with-link
  ));

-- PRIVATE SPACES — WRITE (track my presence / broadcast into the room). Same gate.
drop policy if exists rt_space_write on realtime.messages;
create policy rt_space_write on realtime.messages for insert to authenticated with check (
  realtime.messages.extension in ('presence','broadcast')
  and starts_with(realtime.topic(), 'space:')
  and exists (
    select 1 from public.spaces s
    left join public.share_grants g
      on g.resource_type = 'space' and g.resource_id = s.id
     and g.grantee = auth.uid() and g.scope = 'join'
    where s.id = substring(realtime.topic() from 7)
      and (s.owner = auth.uid() or g.grantee is not null or s.privacy = 'unlisted')
  ));

-- LEGACY PUBLIC REALMS — keep the 10 public worlds + the 'village' counter +
-- passphrase 'realm:'/'village' topics working AFTER public access is OFF. With
-- the switch flipped, anon can ONLY use topics that have a permissive policy, so
-- grant anon presence/broadcast explicitly on the public namespaces. This is the
-- honest "obscurity tier": open to anyone, clearly labeled not-private in the UI.
drop policy if exists rt_pub_realm_anon_read on realtime.messages;
create policy rt_pub_realm_anon_read on realtime.messages for select to anon, authenticated using (
  realtime.messages.extension in ('presence','broadcast')
  and (starts_with(realtime.topic(), 'realm:') or realtime.topic() = 'village'));
drop policy if exists rt_pub_realm_anon_write on realtime.messages;
create policy rt_pub_realm_anon_write on realtime.messages for insert to anon, authenticated with check (
  realtime.messages.extension in ('presence','broadcast')
  and (starts_with(realtime.topic(), 'realm:') or realtime.topic() = 'village'));

commit;

-- ============================================================================
-- 5) OPTIONAL — a non-enumerable "allowlist" creations tier (friends graph).
--    Borrowed from the allowlist proposal. Enable LATER if you want "visible to
--    people I mutually-allow" without per-person grants. It is SAFE as a row-
--    filter (unlike the dropped migration_002 filter) because the predicate
--    requires is_mutual(viewer, owner) — an attacker only ever sees rows of
--    owners who allowed them back; it is NOT enumerable by an arbitrary anon.
--    LEFT COMMENTED so the recommended core ships without committing to a social
--    graph. Run this block separately, deliberately, if/when you add friends.
-- ----------------------------------------------------------------------------
-- begin;
-- create table if not exists public.relationships (
--   src uuid not null references auth.users(id) on delete cascade,   -- "src allows dst"
--   dst uuid not null references auth.users(id) on delete cascade,
--   created_at timestamptz not null default now(),
--   primary key (src, dst), check (src <> dst));
-- create index if not exists relationships_dst_idx on public.relationships(dst);
-- alter table public.relationships enable row level security;
-- drop policy if exists rel_read_own on public.relationships;
-- create policy rel_read_own  on public.relationships for select to authenticated
--   using (src = auth.uid() or dst = auth.uid());   -- see edges you're part of
-- drop policy if exists rel_write_own on public.relationships;
-- create policy rel_write_own on public.relationships for insert to authenticated
--   with check (src = auth.uid());                  -- only allow as yourself
-- drop policy if exists rel_delete_own on public.relationships;
-- create policy rel_delete_own on public.relationships for delete to authenticated
--   using (src = auth.uid());                       -- only unallow your own edge
-- create or replace function public.is_mutual(a uuid, b uuid)
--   returns boolean language sql stable security definer set search_path = public as $$
--   select exists (select 1 from public.relationships where src=a and dst=b)
--      and exists (select 1 from public.relationships where src=b and dst=a); $$;
-- -- widen the creations visibility check, then add the non-enumerable filter:
-- alter table public.creations drop constraint creations_visibility_check;        -- (confirm the real constraint name first)
-- alter table public.creations add  constraint creations_visibility_check
--   check (visibility in ('private','unlisted','allowlist','public'));
-- drop policy if exists creations_allowlist_read on public.creations;
-- create policy creations_allowlist_read on public.creations for select to authenticated
--   using (visibility = 'allowlist' and public.is_mutual(auth.uid(), owner));
-- commit;

-- ============================================================================
-- VERIFY — run as the anon/publishable role over REST with a REAL user JWT
-- (NOT in the SQL editor, which runs as a superuser and bypasses RLS). The bar:
-- a third party can re-run these and observe the result.
--   • GET /rest/v1/creations?visibility=eq.unlisted        -> []   (migration_002 still holds; unlisted not enumerable)
--   • GET /rest/v1/share_grants                            -> only rows you hold or issued
--   • rpc fetch_creation(<an unlisted id you know>)        -> the row
--   • rpc fetch_creation(<someone else's PRIVATE id>)      -> null (no leak)
--   • try INSERT into share_grants directly                -> DENIED (no insert policy)
--   • rpc grant_share for a resource you do NOT own        -> raises 'not authorized'
--   • subscribe private:true to 'space:<id>' WITHOUT a join grant -> JOIN REJECTED
--   • subscribe private:true to 'space:<id>' WITH a join grant    -> JOIN OK, presence syncs
--   • subscribe (anon) to 'realm:<id>'                     -> JOIN OK (public tier still open)
-- Only after the two channel-join lines behave as written is "account-private
-- room" a truthful claim. Until then it is unlisted-link + passphrase obscurity.
-- ============================================================================