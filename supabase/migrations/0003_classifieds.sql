create table public.classifieds (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  price numeric(10,2),
  status text not null default 'available' check (status in ('available','claimed','gone')),
  is_removed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classified_images (
  id uuid primary key default gen_random_uuid(),
  classified_id uuid not null references public.classifieds (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index classifieds_created_idx on public.classifieds (created_at desc) where is_removed = false;
create index classified_images_parent_idx on public.classified_images (classified_id, sort_order);

alter table public.classifieds enable row level security;
alter table public.classified_images enable row level security;

create policy "classifieds_select" on public.classifieds for select
  using (is_removed = false or public.is_admin());
create policy "classifieds_insert" on public.classifieds for insert
  with check (author_id = auth.uid());
create policy "classifieds_update" on public.classifieds for update
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());
create policy "classifieds_delete" on public.classifieds for delete
  using (author_id = auth.uid() or public.is_admin());

create policy "classified_images_select" on public.classified_images for select
  using (true);
create policy "classified_images_insert" on public.classified_images for insert
  with check (exists (
    select 1 from public.classifieds c
    where c.id = classified_id and c.author_id = auth.uid()
  ));
create policy "classified_images_delete" on public.classified_images for delete
  using (exists (
    select 1 from public.classifieds c
    where c.id = classified_id and (c.author_id = auth.uid() or public.is_admin())
  ));

create trigger classifieds_touch_updated_at
  before update on public.classifieds
  for each row execute function public.touch_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('classified-images', 'classified-images', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "classified_images_upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'classified-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "classified_images_owner_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'classified-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
