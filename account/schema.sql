-- xclusivexo accounts — run once in the Supabase dashboard → SQL Editor → New query → Run.
-- Minimal + privacy-first: a profile per user, saved creations with row-level security (RLS).
-- RLS is the security baseline: every row access is checked against the signed-in user.

-- 1) profiles: one row per authenticated user (handle is the only thing we ask for)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  handle     text unique,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles readable by anyone"   on public.profiles for select using (true);
create policy "users manage their own profile" on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- 2) creations: saved critters + rooms, each with a visibility tier
create table if not exists public.creations (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('critter','room')),
  name       text check (name is null or char_length(name) <= 40),
  spec       jsonb not null check (length(spec::text) <= 65536),  -- bound payload size server-side (client caps are advisory)
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  approved   boolean not null default false,   -- gates the PUBLIC (listed) tier only
  created_at timestamptz not null default now()
);
alter table public.creations enable row level security;
-- private + unlisted: owner only in the DB. Sharing is done with the self-contained #c=/#r= link
--   (it carries the full design in the URL — no DB read), so "unlisted" needs no public SELECT.
-- public: listed only when approved. A by-id fetch for unlisted (true invite links) should be a
--   SECURITY DEFINER rpc(p_id uuid) that requires the id — NOT a blanket row-filter, which is
--   enumerable by anyone (it cannot require the caller to already know the id).
create policy "owner reads own"                on public.creations for select using (auth.uid() = owner);
create policy "approved-public readable"       on public.creations for select
  using (visibility = 'public' and approved = true);
create policy "owner inserts own"              on public.creations for insert with check (auth.uid() = owner);
create policy "owner updates own"              on public.creations for update
  using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "owner deletes own"              on public.creations for delete using (auth.uid() = owner);

-- cap rows per account (anti-spam; client cannot be trusted)
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

-- 3) auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();
