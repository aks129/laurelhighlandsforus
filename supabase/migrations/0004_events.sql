create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  meet_url text,
  recap text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index events_starts_idx on public.events (starts_at desc);

alter table public.events enable row level security;

create policy "events_select" on public.events for select
  using (auth.uid() is not null);
create policy "events_admin_insert" on public.events for insert
  with check (public.is_admin());
create policy "events_admin_update" on public.events for update
  using (public.is_admin()) with check (public.is_admin());
create policy "events_admin_delete" on public.events for delete
  using (public.is_admin());
