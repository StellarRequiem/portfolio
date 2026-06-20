-- ============================================================================
-- OPERATOR: REVIEW + RUN BY HAND — NOT APPLIED
-- migration_004_chat_moderation.sql
-- Realtime Authorization for the village chat relay (project bhrwgygqpahtclwnrjmp).
--
-- GOAL
--   anon may RECEIVE (SELECT) broadcasts on the private chat:<realm> topic, but anon may NOT
--   broadcast (INSERT) directly. The ONLY writer is the chat-relay Edge Function, which uses the
--   service-role/secret key (BYPASSRLS). Meanwhile the existing public realm:<id> channel
--   (presence + DJ-sync 'club' broadcast + remote-player movement) MUST keep working.
--
-- ⚠ THE CORRECTION THAT MAKES THIS REAL (was the DO-NOT-SHIP blocker) ⚠
--   The prior design assumed per-channel config:{ private:true } would enforce authorization on
--   chat:<realm> while "Allow public access" stayed ON project-wide. The CURRENT Supabase docs
--   (verified June 2026) say otherwise:
--     * "To enforce private channels you need to disable the 'Allow public access' setting in
--        Realtime Settings."  (docs/guides/realtime/authorization)
--     * Channel Restrictions is a PROJECT-WIDE binary mode (allow-public  vs.  private-only).
--        There is NO per-channel coexistence mode that enforces.  (docs/guides/realtime/settings)
--     * With public access ON, a tampered client subscribes/sends to the SAME topic name with
--        config:{ private:false } — Realtime treats it as a DISTINCT PUBLIC channel and the
--        realtime.messages RLS deny is NEVER evaluated.  (Supabase Discussion #29334)
--   => The project-wide cutover to PRIVATE-ONLY is REQUIRED, not avoidable. Because the cutover is
--      project-wide, the public realm:% channels would break the instant it flips UNLESS explicit
--      allow-policies for realm:% exist FIRST. Those policies below are therefore ACTIVE (not
--      commented). See account/CHAT_MODERATION.md for the exact safe-order runbook; this SQL is
--      step (a)+(b) of that runbook and is no-op/additive while public access is still ON.
--
-- VERIFIED FACTS BEHIND THIS SQL (live Supabase docs, June 2026)
--   * RLS on realtime.messages gates by TOPIC (realtime.topic() helper) + extension
--     ('broadcast' | 'presence') ONLY. There is NO event-name column -> chat MUST be its own topic
--     (chat:<realm>); we cannot deny only the 'chat' event on realm:<id> without also killing the
--     'club' DJ-sync broadcast. That is why chat moves to a separate topic.
--   * service_role / secret key BYPASSRLS — "uses the BYPASSRLS attribute, skipping any and all Row
--     Level Security policies" (docs/guides/api/api-keys). The relay's writes are unaffected by RLS.
--   * RLS is deny-by-default: with RLS enabled and NO permissive INSERT policy for anon on chat:%,
--     anon INSERT (direct broadcast) is denied.
--
-- IDEMPOTENT: every CREATE is preceded by a matching DROP ... IF EXISTS, so this is safe to re-run.
-- ============================================================================


-- ── 0) PRE-STATE: realtime.messages already has RLS enabled by Supabase for Realtime Authorization.
--      This is a no-op assertion; uncomment ONLY if an audit shows RLS somehow disabled. ──
-- alter table realtime.messages enable row level security;


-- ── 1) AUDIT FIRST (run this SELECT, READ the output, do NOT blindly proceed) ──
--      If ANY pre-existing PERMISSIVE policy grants INSERT to anon/public on realtime.messages
--      without a topic restriction, a tampered client could broadcast on chat:% and the whole design
--      leaks. Inspect what already exists before adding ours:
--   select schemaname, tablename, policyname, cmd, roles, qual, with_check
--     from pg_policies where schemaname = 'realtime' and tablename = 'messages';
--      EXPECT: no broad anon/public INSERT on chat:%. If one exists, remove/scope it first.


-- ── 2) PUBLIC-REALM ALLOW POLICIES (ACTIVE — apply BEFORE the cutover) ──
--      These re-permit presence + DJ-sync 'club' + ambient broadcast on realm:% so the public worlds
--      survive the project-wide flip to private-only. They are ADDITIVE and a NO-OP while public
--      access is still ON, so applying them early is safe. NOTE: RLS cannot scope to an event name,
--      so the broadcast allow re-permits ALL broadcast on realm:% (the pre-cutover behavior). That is
--      acceptable ONLY because chat no longer lives on realm:% — it moved to chat:%.

-- 2a) presence READ on realm:* (live headcount + seeing other real players):
drop policy if exists "village public realm presence read" on realtime.messages;
create policy "village public realm presence read"
  on realtime.messages
  for select
  to anon, authenticated
  using (
    realtime.messages.extension = 'presence'
    and realtime.topic() like 'realm:%'
  );

-- 2b) presence WRITE on realm:* (each client track()s its own presence -> needs INSERT):
drop policy if exists "village public realm presence write" on realtime.messages;
create policy "village public realm presence write"
  on realtime.messages
  for insert
  to anon, authenticated
  with check (
    realtime.messages.extension = 'presence'
    and realtime.topic() like 'realm:%'
  );

-- 2c) broadcast READ on realm:* (receive the 'club' DJ-sync broadcast):
drop policy if exists "village public realm broadcast read" on realtime.messages;
create policy "village public realm broadcast read"
  on realtime.messages
  for select
  to anon, authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() like 'realm:%'
  );

-- 2d) broadcast WRITE on realm:* (send the 'club' DJ-sync broadcast — the DJ client does this):
--      Re-permits ALL anon broadcast on realm:% (cannot scope to the 'club' event). Acceptable
--      because chat is no longer on realm:%; the only broadcast there is 'club' DJ-sync.
drop policy if exists "village public realm broadcast write" on realtime.messages;
create policy "village public realm broadcast write"
  on realtime.messages
  for insert
  to anon, authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() like 'realm:%'
  );

-- 2e) (OPTIONAL) the lobby/presence-only 'village' channel, if it is still created with presence.
--      Uncomment if the regression test shows the global headcount lobby breaks after the cutover.
-- drop policy if exists "village lobby presence read" on realtime.messages;
-- create policy "village lobby presence read"
--   on realtime.messages
--   for select
--   to anon, authenticated
--   using ( realtime.messages.extension = 'presence' and realtime.topic() = 'village' );
-- drop policy if exists "village lobby presence write" on realtime.messages;
-- create policy "village lobby presence write"
--   on realtime.messages
--   for insert
--   to anon, authenticated
--   with check ( realtime.messages.extension = 'presence' and realtime.topic() = 'village' );


-- ── 3) CHAT READ POLICY: anon (and authenticated) may SELECT broadcast on chat:* topics ──
--      This is what lets a client SUBSCRIBE to chat:<realm> and RECEIVE relayed messages.
--      SCOPE CAVEAT (review SHOULD-FIX #7): this grants read on the ENTIRE chat:% namespace with no
--      per-realm membership check. So ANY anon can subscribe to ANY chat:<id>, including a private
--      link-space's chat:<spaceId>. That means a private link-space's chat is only as private as its
--      unguessable id — it is "unlisted", NOT "members-only". This matches the obscurity-vs-enforced
--      distinction in account/PRIVACY_PROPOSAL.md ("Table rules alone do nothing for room joins ...
--      a 'private room' is still just an unlisted link"). If real per-space chat isolation is needed
--      later, gate SELECT on a membership table (e.g. share_grants from migration_003) instead of a
--      blanket chat:% allow — see the commented variant in section 5.
drop policy if exists "village anon read chat broadcast" on realtime.messages;
create policy "village anon read chat broadcast"
  on realtime.messages
  for select
  to anon, authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() like 'chat:%'
  );


-- ── 4) NO INSERT POLICY for anon/authenticated on chat:* (INTENTIONALLY ABSENT) ──
--      Deny-by-default: with RLS on and no permissive INSERT policy, anon/authenticated CANNOT
--      INSERT (direct-broadcast) on chat:%. The chat-relay Edge Function writes via the service-role
--      key (BYPASSRLS), so it is unaffected. DO NOT add an anon/authenticated INSERT policy for
--      chat:% — that would reopen the bypass. (No statement here on purpose; this comment IS the
--      control, enforced by deny-by-default.)


-- ── 5) (COMMENTED) per-space membership-scoped chat read — the stronger variant ──
--      Use this INSTEAD of the blanket chat:% read in section 3 IF private link-spaces must be
--      members-only rather than unlisted. Requires migration_003's share_grants + an auth identity
--      (auth.uid()), so it only works once clients carry a real/anonymous session token. Public
--      realm chats would need their own broad allow (e.g. topic like 'chat:realm:%').
-- drop policy if exists "village anon read chat broadcast" on realtime.messages;  -- replace section 3
-- create policy "space members read chat broadcast"
--   on realtime.messages
--   for select
--   to authenticated
--   using (
--     realtime.messages.extension = 'broadcast'
--     and realtime.topic() like 'chat:space:%'
--     and exists (
--       select 1 from public.share_grants g
--       where g.resource_type = 'space'
--         and ('chat:space:' || g.resource_id) = realtime.topic()
--         and g.grantee = auth.uid()
--     )
--   );


-- ── 6) VERIFY after applying (and BEFORE the cutover) ──
--   select policyname, cmd, roles from pg_policies
--     where schemaname='realtime' and tablename='messages' order by policyname;
--   EXPECT (at minimum):
--     village anon read chat broadcast          | SELECT | {anon,authenticated}
--     village public realm broadcast read        | SELECT | {anon,authenticated}
--     village public realm broadcast write       | INSERT | {anon,authenticated}
--     village public realm presence read         | SELECT | {anon,authenticated}
--     village public realm presence write        | INSERT | {anon,authenticated}
--   Then run the smoke tests in account/CHAT_MODERATION.md:
--     (a) while STILL public: presence/headcount/club/chat-receive all work (policies are no-op);
--     (b) AFTER flipping to private-only: re-run the same regression PLUS the deny tests
--         (direct anon broadcast on chat:% is rejected; the private:false same-name bypass is denied).
