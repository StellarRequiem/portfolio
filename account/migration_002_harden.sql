-- migration_002_harden.sql
-- Run once: Supabase dashboard → SQL Editor → New query → paste → Run.
-- Hardens the `creations` table after the security review. Safe to re-run (idempotent).
--
-- WHY (the one that matters): the original "unlisted or approved-public readable" policy was a
-- blanket row-filter. RLS cannot require a caller to already know a row's id, so
--   select * from creations where visibility = 'unlisted'
-- returned EVERY unlisted row to anyone (anon included) — "unlisted" was effectively "listed".
-- Sharing already works via the self-contained #c=/#r= link (the full design lives in the URL,
-- no DB read), so unlisted needs no public SELECT at all. We drop that branch; unlisted becomes
-- owner-only in the DB. (A true by-id invite-link fetch should later be a SECURITY DEFINER rpc
-- that REQUIRES the id, not a row-filter.)

-- 1) Replace the leaky SELECT policy.
drop policy if exists "unlisted or approved-public readable" on public.creations;
drop policy if exists "approved-public readable"             on public.creations;
create policy "approved-public readable" on public.creations for select
  using (visibility = 'public' and approved = true);

-- 2) Server-side bounds — the client caps (props≤30, outfit≤4, name length) are advisory only,
--    bypassable by anyone holding the publishable key + their own JWT.
alter table public.creations drop constraint if exists creations_name_len;
alter table public.creations add  constraint creations_name_len  check (name is null or char_length(name) <= 40);
alter table public.creations drop constraint if exists creations_spec_size;
alter table public.creations add  constraint creations_spec_size check (length(spec::text) <= 65536);

-- 3) Per-account row cap (anti-spam; a signed-in user could otherwise insert unbounded rows).
create or replace function public.cap_creations()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.creations where owner = new.owner) >= 200 then
    raise exception 'creation limit reached (200 per account)';
  end if;
  return new;
end; $$;
drop trigger if exists creations_cap on public.creations;
create trigger creations_cap before insert on public.creations
  for each row execute function public.cap_creations();

-- VERIFY (run as the anon/publishable role, e.g. via the REST API, NOT the SQL editor which is
-- superuser and bypasses RLS): an anon GET of /rest/v1/creations?visibility=eq.unlisted must
-- return [] even when unlisted rows exist.
