# Phase 1 — Plan 3: Classifieds ("Free Pile") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A members-only classifieds board (the "free pile") where owners post surplus furniture and supplies with photos, a price (or Free), and an Available/Claimed/Gone status — self-serve and auto-published, owner-managed, admin-removable.

**Architecture:** `classifieds` + `classified_images` tables (RLS like `resources`), plus a public Supabase **Storage** bucket `classified-images` (uploads scoped to each user's folder by storage RLS). A Server Action uploads photos with the user's session and inserts rows. UI reuses the "autumn lodge" design system.

**Tech Stack:** Next.js 16 App Router, Supabase Postgres + Storage (`@supabase/ssr`), Tailwind v4 + shadcn, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-03-laurel-highlands-owner-community-phase-1-design.md`

**Hosting note:** Hosted DB is `supabase-pink-house` (ref `ryfzzlcvnqilvrhjncvn`). Migrations + bucket + storage policies applied via the Management API query endpoint.

---

## File structure

```
supabase/migrations/0003_classifieds.sql   # tables, RLS, bucket, storage policies, trigger
lib/classifieds.ts                          # types, STATUSES, formatPrice, validation — pure
components/classified-card.tsx              # one listing card (photo, price, status)
components/classified-actions.tsx           # owner status select + delete; admin remove (client)
app/(members)/classifieds/page.tsx          # grid + status filter
app/(members)/classifieds/new/page.tsx      # post form (multi-photo)
app/(members)/classifieds/actions.ts        # createClassified / setStatus / removeClassified / deleteClassified
components/site-nav.tsx                      # add Classifieds link (modify)
app/(members)/home/page.tsx                 # live Marketplace quick-link (modify)
tests/unit/classifieds.test.ts              # formatPrice + validation
tests/e2e/classifieds.spec.ts               # post -> appears (skipped unless E2E_LOCAL=1)
```

---

## Task 1: migration — tables, RLS, storage bucket + policies

**Files:** Create `supabase/migrations/0003_classifieds.sql`

- [ ] **Step 1: Write the migration**

```sql
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

-- classifieds policies (mirror resources)
create policy "classifieds_select" on public.classifieds for select
  using (is_removed = false or public.is_admin());
create policy "classifieds_insert" on public.classifieds for insert
  with check (author_id = auth.uid());
create policy "classifieds_update" on public.classifieds for update
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());
create policy "classifieds_delete" on public.classifieds for delete
  using (author_id = auth.uid() or public.is_admin());

-- image rows: readable by all signed-in; writable tied to parent ownership
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

-- Storage bucket for photos (public read; uploads scoped to user folder)
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
```

- [ ] **Step 2:** Apply to hosted via Management API (POST file to `/v1/projects/<ref>/database/query`). Expect HTTP 201. Note: storage policy creation on `storage.objects` is permitted via the SQL API.
- [ ] **Step 3:** Verify — `classifieds` (9 cols) + `classified_images` (5 cols) exist; bucket `classified-images` exists (`select id,public from storage.buckets where id='classified-images'`); policies present on both tables + `storage.objects`.
- [ ] **Step 4:** Commit `supabase/migrations/0003_classifieds.sql`.

---

## Task 2: classifieds domain module (TDD)

**Files:** Create `lib/classifieds.ts`; Test `tests/unit/classifieds.test.ts`

- [ ] **Step 1: Failing test** `tests/unit/classifieds.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { STATUSES, STATUS_LABELS, formatPrice, validateClassified, type ClassifiedInput } from '@/lib/classifieds'

const valid: ClassifiedInput = { title: 'Queen bed', description: 'Good shape', price: 50 }

describe('classifieds domain', () => {
  it('formats a price and Free', () => {
    expect(formatPrice(50)).toBe('$50')
    expect(formatPrice(19.99)).toBe('$19.99')
    expect(formatPrice(null)).toBe('Free')
  })
  it('lists statuses with labels', () => {
    expect(STATUSES).toEqual(['available', 'claimed', 'gone'])
    expect(STATUS_LABELS.available).toBe('Available')
  })
  it('accepts a valid listing and requires a title', () => {
    expect(validateClassified(valid).ok).toBe(true)
    expect(validateClassified({ ...valid, title: '  ' }).ok).toBe(false)
  })
  it('rejects a negative price', () => {
    expect(validateClassified({ ...valid, price: -5 }).ok).toBe(false)
  })
})
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** `lib/classifieds.ts`:

```ts
export const STATUSES = ['available', 'claimed', 'gone'] as const
export type Status = (typeof STATUSES)[number]

export const STATUS_LABELS: Record<Status, string> = {
  available: 'Available',
  claimed: 'Claimed',
  gone: 'Gone',
}

export interface Classified {
  id: string
  author_id: string
  title: string
  description: string
  price: number | null
  status: Status
  is_removed: boolean
  created_at: string
  updated_at: string
}

export interface ClassifiedImage {
  id: string
  classified_id: string
  storage_path: string
  sort_order: number
}

export interface ClassifiedInput {
  title: string
  description: string
  price: number | null
}

export type ValidationResult = { ok: true } | { ok: false; error: string }

export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return 'Free'
  const n = Number(price)
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`
}

export function validateClassified(input: ClassifiedInput): ValidationResult {
  if (!input.title || input.title.trim().length === 0) {
    return { ok: false, error: 'Please add a title.' }
  }
  if (input.price !== null && (Number.isNaN(input.price) || input.price < 0)) {
    return { ok: false, error: 'Price can’t be negative.' }
  }
  return { ok: true }
}
```

- [ ] **Step 4:** Run → PASS. **Step 5:** Commit.

---

## Task 3: list page + classified card

**Files:** Create `components/classified-card.tsx`, `app/(members)/classifieds/page.tsx`

- [ ] **Step 1: `components/classified-card.tsx`** (photo, status badge, price). The page passes a precomputed public image URL.

```tsx
import { formatPrice, STATUS_LABELS, type Classified } from '@/lib/classifieds'
import { ClassifiedActions } from '@/components/classified-actions'

const STATUS_STYLE: Record<string, string> = {
  available: 'bg-pine/12 text-pine',
  claimed: 'bg-amber/20 text-amber',
  gone: 'bg-muted text-muted-foreground',
}

export function ClassifiedCard({
  item,
  imageUrl,
  canManage,
  isAdmin,
}: {
  item: Classified
  imageUrl: string | null
  canManage: boolean
  isAdmin: boolean
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-[4/3] bg-muted">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={item.title} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center font-display text-2xl text-muted-foreground/50">
            No photo
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[item.status]}`}
        >
          {STATUS_LABELS[item.status]}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
          <span className="shrink-0 font-display text-lg text-pine-deep">{formatPrice(item.price)}</span>
        </div>
        {item.description && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        )}
        {(canManage || isAdmin) && (
          <div className="mt-4 border-t border-border pt-3">
            <ClassifiedActions id={item.id} status={item.status} canManage={canManage} isAdmin={isAdmin} />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `app/(members)/classifieds/page.tsx`** — fetch listings + first image each, compute public URLs, render grid with status filter `?status=`.

```tsx
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { STATUSES, STATUS_LABELS, type Status, type Classified, type ClassifiedImage } from '@/lib/classifieds'
import { buttonVariants } from '@/components/ui/button'
import { ClassifiedCard } from '@/components/classified-card'

export default async function ClassifiedsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const active = STATUSES.includes(status as Status) ? (status as Status) : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user!.id).single<{ role: string }>()
  const isAdmin = me?.role === 'admin'

  let query = supabase
    .from('classifieds')
    .select('*')
    .eq('is_removed', false)
    .order('created_at', { ascending: false })
  if (active) query = query.eq('status', active)
  const { data: items } = await query.returns<Classified[]>()

  // first image per listing -> public URL
  const ids = (items ?? []).map((i) => i.id)
  const imageMap = new Map<string, string>()
  if (ids.length) {
    const { data: imgs } = await supabase
      .from('classified_images')
      .select('*')
      .in('classified_id', ids)
      .order('sort_order', { ascending: true })
      .returns<ClassifiedImage[]>()
    for (const img of imgs ?? []) {
      if (!imageMap.has(img.classified_id)) {
        const { data } = supabase.storage.from('classified-images').getPublicUrl(img.storage_path)
        imageMap.set(img.classified_id, data.publicUrl)
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-pine-deep">The free pile</h1>
          <p className="mt-2 text-muted-foreground">
            Furniture and supplies passing between owners. One host&rsquo;s spare is another&rsquo;s setup.
          </p>
        </div>
        <Link href="/classifieds/new" className={buttonVariants()}>
          <Plus className="size-4" /> Post an item
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/classifieds"
          className={`rounded-full border px-3 py-1 text-sm transition-colors ${!active ? 'border-pine bg-pine text-primary-foreground' : 'border-border text-muted-foreground hover:border-pine/50'}`}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/classifieds?status=${s}`}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${active === s ? 'border-pine bg-pine text-primary-foreground' : 'border-border text-muted-foreground hover:border-pine/50'}`}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {items && items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ClassifiedCard
              key={item.id}
              item={item}
              imageUrl={imageMap.get(item.id) ?? null}
              canManage={item.author_id === user!.id}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-12 text-center">
          <p className="font-display text-xl text-pine-deep">Nothing here yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Got a spare bed, sofa, or box of supplies? List it.</p>
          <Link href="/classifieds/new" className={buttonVariants({ className: 'mt-5' })}>
            <Plus className="size-4" /> Post an item
          </Link>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3:** Build (needs `ClassifiedActions` from Task 5 — implement Task 5 before building, or stub). **Step 4:** Commit.

---

## Task 4: post form + create action (with photo upload)

**Files:** Create `app/(members)/classifieds/new/page.tsx`, `app/(members)/classifieds/actions.ts`

- [ ] **Step 1: `app/(members)/classifieds/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validateClassified, STATUSES, type Status } from '@/lib/classifieds'

const MAX_PHOTOS = 4
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export async function createClassified(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const priceRaw = String(formData.get('price') ?? '').trim()
  const isFree = formData.get('free') === 'on'
  const price = isFree || priceRaw === '' ? null : Number(priceRaw)

  const check = validateClassified({ title, description, price })
  if (!check.ok) redirect('/classifieds/new?error=1')

  const { data: created, error } = await supabase
    .from('classifieds')
    .insert({ title, description, price, author_id: user.id })
    .select('id')
    .single<{ id: string }>()
  if (error || !created) redirect('/classifieds/new?error=1')

  const files = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0)
  let order = 0
  for (const file of files.slice(0, MAX_PHOTOS)) {
    if (!ALLOWED.includes(file.type) || file.size > 5_242_880) continue
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${user.id}/${created.id}-${order}.${ext}`
    const bytes = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await supabase.storage
      .from('classified-images')
      .upload(path, bytes, { contentType: file.type, upsert: true })
    if (!upErr) {
      await supabase.from('classified_images').insert({
        classified_id: created.id,
        storage_path: path,
        sort_order: order,
      })
      order++
    }
  }

  revalidatePath('/classifieds')
  redirect('/classifieds')
}

export async function setStatus(id: string, status: Status) {
  if (!STATUSES.includes(status)) return
  const supabase = await createClient()
  await supabase.from('classifieds').update({ status }).eq('id', id)
  revalidatePath('/classifieds')
}

export async function removeClassified(id: string) {
  const supabase = await createClient()
  await supabase.from('classifieds').update({ is_removed: true }).eq('id', id)
  revalidatePath('/classifieds')
}

export async function deleteClassified(id: string) {
  const supabase = await createClient()
  await supabase.from('classifieds').delete().eq('id', id)
  revalidatePath('/classifieds')
}
```

- [ ] **Step 2: `app/(members)/classifieds/new/page.tsx`** (title, description, price + Free checkbox, multi-photo file input)

```tsx
import Link from 'next/link'
import { createClassified } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function NewClassifiedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/classifieds" className="text-sm text-pine hover:underline">&larr; Back to the free pile</Link>
      <h1 className="mt-4 font-display text-3xl text-pine-deep">Post an item</h1>
      <p className="mt-2 text-sm text-muted-foreground">Add a few photos and it publishes right away.</p>
      {error && (
        <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Please add a title (and a non-negative price, or mark it free).
        </p>
      )}
      <form action={createClassified} className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" name="title" required placeholder="Queen bed frame" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea id="description" name="description" rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none" />
        </div>
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="price">Price ($)</Label>
            <Input id="price" name="price" type="number" min={0} step="0.01" placeholder="50" />
          </div>
          <label className="flex items-center gap-2 pb-2.5 text-sm text-muted-foreground">
            <input type="checkbox" name="free" className="size-4 accent-[var(--pine)]" /> It&rsquo;s free
          </label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="photos">Photos (up to 4)</Label>
          <input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-pine file:px-3 file:py-2 file:text-sm file:text-primary-foreground hover:file:bg-pine-deep" />
        </div>
        <Button type="submit" size="lg" className="w-full">Post to the free pile</Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3:** Build. **Step 4:** Commit.

---

## Task 5: owner/admin actions component

**Files:** Create `components/classified-actions.tsx`

- [ ] **Step 1:** Client component — owner sees a status `<select>` (available/claimed/gone) + Delete; a non-owner admin sees Remove. Uses actions from Task 4.

```tsx
'use client'

import { useTransition } from 'react'
import { STATUSES, STATUS_LABELS, type Status } from '@/lib/classifieds'
import { setStatus, deleteClassified, removeClassified } from '@/app/(members)/classifieds/actions'

export function ClassifiedActions({
  id,
  status,
  canManage,
  isAdmin,
}: {
  id: string
  status: Status
  canManage: boolean
  isAdmin: boolean
}) {
  const [pending, start] = useTransition()

  if (canManage) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <select
          aria-label="Status"
          defaultValue={status}
          disabled={pending}
          onChange={(e) => start(() => void setStatus(id, e.target.value as Status))}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending}
          className="text-xs text-muted-foreground hover:text-destructive"
          onClick={() => {
            if (confirm('Delete this listing?')) start(() => void deleteClassified(id))
          }}
        >
          Delete
        </button>
      </div>
    )
  }

  if (isAdmin) {
    return (
      <button
        type="button"
        disabled={pending}
        className="text-xs text-muted-foreground hover:text-destructive"
        onClick={() => {
          if (confirm('Remove this listing?')) start(() => void removeClassified(id))
        }}
      >
        Remove listing
      </button>
    )
  }
  return null
}
```

- [ ] **Step 2:** Build (resolves Task 3 reference). **Step 3:** Commit.

---

## Task 6: wire into nav + home

- [ ] **Step 1:** `components/site-nav.tsx` — add `{ href: '/classifieds', label: 'Free Pile' }` after Directory.
- [ ] **Step 2:** `app/(members)/home/page.tsx` — add a live quick-link `{ href: '/classifieds', icon: Recycle, title: 'The free pile', body: 'Claim or pass along furniture & supplies.', live: true }`; remove "Members’ marketplace" from the `COMING` array.
- [ ] **Step 3:** Build. **Step 4:** Commit.

---

## Task 7: E2E (skipped unless local)

**Files:** Create `tests/e2e/classifieds.spec.ts` — mirror `directory.spec.ts` (magic-link via Mailpit, guarded by `E2E_LOCAL`): sign in → onboarding → `/classifieds/new` → fill title + price + (optionally a small fixture image) → Post → assert the title appears on `/classifieds`. Commit.

---

## Task 8: deploy + smoke test

- [ ] `npm run build` + `npm test` green; migration `0003` applied to hosted; bucket exists.
- [ ] `vercel deploy --prod --yes`.
- [ ] Smoke: signed-out `/classifieds` → 307 `/login`. Authenticated: post an item with a photo → it renders with the image + status badge.

---

## Self-review

**Spec coverage:** classifieds with photos, price/Free, Available/Claimed/Gone status, self-serve auto-publish, owner status+delete, admin remove → Tasks 1–6 ✓. Supabase Storage with per-user-folder RLS ✓. Design-system consistency ✓.

**Placeholder scan:** full code in every step; the one forward reference (`ClassifiedActions` in Task 3) is flagged with build ordering.

**Type consistency:** `Classified`/`Status`/`formatPrice`/`validateClassified` defined once in `lib/classifieds.ts`; actions (`createClassified`/`setStatus`/`removeClassified`/`deleteClassified`) defined in Task 4, consumed in Task 5. Storage bucket id `classified-images` consistent across migration, action upload, and page `getPublicUrl`.
