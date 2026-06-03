-- Profiles: one row per authenticated member.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  community text check (community in ('hidden_valley', 'seven_springs', 'other')),
  num_properties integer check (num_properties is null or num_properties >= 0),
  role text not null default 'member' check (role in ('member', 'admin')),
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Admin check without recursive RLS evaluation.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- A member can read their own profile; an admin can read all.
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

-- A member can update their own profile, but CANNOT change their own role.
-- The with-check pins role to its current stored value, so a member cannot
-- self-promote to admin via the Supabase API (RLS is the security boundary,
-- not the app). Admin promotion happens via the seed script over a privileged
-- (service-role) connection, which bypasses RLS.
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
