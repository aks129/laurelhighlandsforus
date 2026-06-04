create table public.resources (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in (
    'cleaner','handyman','contractor','landscaping','hot_tub','snow_removal','other'
  )),
  business_name text not null,
  contact_name text,
  phone text,
  email text,
  website text,
  area_served text,
  description text not null default '',
  is_removed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resources_category_idx on public.resources (category) where is_removed = false;
create index resources_created_idx on public.resources (created_at desc) where is_removed = false;

alter table public.resources enable row level security;

-- Read: any signed-in member sees non-removed rows; admins see all.
create policy "resources_select" on public.resources for select
  using (is_removed = false or public.is_admin());

-- Insert: only as yourself.
create policy "resources_insert" on public.resources for insert
  with check (author_id = auth.uid());

-- Update: your own rows, or admin (for soft-remove).
create policy "resources_update" on public.resources for update
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

-- Delete: your own rows, or admin.
create policy "resources_delete" on public.resources for delete
  using (author_id = auth.uid() or public.is_admin());

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger resources_touch_updated_at
  before update on public.resources
  for each row execute function public.touch_updated_at();
