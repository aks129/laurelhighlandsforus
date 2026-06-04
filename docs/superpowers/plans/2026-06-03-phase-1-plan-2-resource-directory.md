# Phase 1 — Plan 2: Resource Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A members-only resource directory where owners list and browse trusted local service providers (cleaners, handymen, contractors, etc.), self-serve and auto-published, with owners managing their own entries and the admin able to remove any.

**Architecture:** A `resources` table (Supabase Postgres) protected by RLS, mirroring the `profiles` pattern (members read non-removed rows, write/edit their own; admin removes any via `is_admin()`). Server Components fetch and render; Server Actions handle create/edit/delete. UI uses the established "autumn lodge" design system (pine/amber/cream tokens, Fraunces/Hanken fonts, shadcn primitives).

**Tech Stack:** Next.js 16 App Router, Supabase (`@supabase/ssr`), Tailwind v4 + shadcn (Base UI), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-03-laurel-highlands-owner-community-phase-1-design.md`

**Hosting note:** Local Docker/Supabase may be down; the hosted DB is `supabase-pink-house` (ref `ryfzzlcvnqilvrhjncvn`). Migrations are committed as SQL files AND applied to the hosted project via the Supabase Management API during the migration task.

---

## File structure (created/modified by this plan)

```
supabase/migrations/0002_resources.sql   # resources table, RLS, indexes, updated_at trigger
lib/resources.ts                          # Resource type, CATEGORIES, labels, validation — pure
components/resource-card.tsx              # one directory listing card
components/resource-actions.tsx           # owner edit/delete + admin remove (client)
app/(members)/directory/page.tsx          # list + category filter
app/(members)/directory/new/page.tsx      # add-resource form
app/(members)/directory/actions.ts        # createResource / removeResource / deleteResource
components/site-nav.tsx                    # add Directory link (modify)
app/(members)/home/page.tsx               # make Directory quick-link live (modify)
tests/unit/resources.test.ts              # validation + category helpers
tests/e2e/directory.spec.ts               # post a resource -> appears; filter
```

---

## Task 1: resources migration (table, RLS, trigger)

**Files:** Create `supabase/migrations/0002_resources.sql`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Apply to hosted DB via Management API** (Docker-independent). Using the project ref `ryfzzlcvnqilvrhjncvn` and a Supabase access token/PAT, POST the file contents to `https://api.supabase.com/v1/projects/<ref>/database/query`. Expect HTTP 201.

- [ ] **Step 3: Verify** the table + 4 policies + trigger exist (query `information_schema.columns` and `pg_policies`). Expect 11 columns, 4 policies (select/insert/update/delete), trigger present.

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/0002_resources.sql
git commit -m "feat(db): resources table with RLS and updated_at trigger"
```

---

## Task 2: resources domain module (TDD)

**Files:** Create `lib/resources.ts`; Test `tests/unit/resources.test.ts`

- [ ] **Step 1: Write the failing test** `tests/unit/resources.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { CATEGORIES, CATEGORY_LABELS, validateResource, type ResourceInput } from '@/lib/resources'

const valid: ResourceInput = { business_name: 'Acme Cleaning', category: 'cleaner', description: 'Great' }

describe('resources domain', () => {
  it('exposes the category list with labels', () => {
    expect(CATEGORIES).toContain('cleaner')
    expect(CATEGORY_LABELS.hot_tub).toBe('Hot Tub Service')
    expect(CATEGORIES.every((c) => typeof CATEGORY_LABELS[c] === 'string')).toBe(true)
  })
  it('accepts a valid resource', () => {
    expect(validateResource(valid).ok).toBe(true)
  })
  it('requires a business name', () => {
    const r = validateResource({ ...valid, business_name: '  ' })
    expect(r.ok).toBe(false)
  })
  it('rejects an unknown category', () => {
    const r = validateResource({ ...valid, category: 'spaceship' as unknown as ResourceInput['category'] })
    expect(r.ok).toBe(false)
  })
  it('rejects a malformed website', () => {
    const r = validateResource({ ...valid, website: 'not a url' })
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run, verify it fails** — `npm test -- resources` → FAIL (module missing).

- [ ] **Step 3: Implement** `lib/resources.ts`:

```ts
export const CATEGORIES = [
  'cleaner', 'handyman', 'contractor', 'landscaping', 'hot_tub', 'snow_removal', 'other',
] as const
export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  cleaner: 'Cleaner',
  handyman: 'Handyman',
  contractor: 'Contractor',
  landscaping: 'Landscaping',
  hot_tub: 'Hot Tub Service',
  snow_removal: 'Snow Removal',
  other: 'Other',
}

export interface Resource {
  id: string
  author_id: string
  category: Category
  business_name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  area_served: string | null
  description: string
  is_removed: boolean
  created_at: string
  updated_at: string
}

export interface ResourceInput {
  business_name: string
  category: Category
  description: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  area_served?: string | null
}

export type ValidationResult = { ok: true } | { ok: false; error: string }

export function validateResource(input: ResourceInput): ValidationResult {
  if (!input.business_name || input.business_name.trim().length === 0) {
    return { ok: false, error: 'Please enter a business or provider name.' }
  }
  if (!CATEGORIES.includes(input.category)) {
    return { ok: false, error: 'Please choose a category.' }
  }
  if (input.website && input.website.trim().length > 0) {
    try {
      // eslint-disable-next-line no-new
      new URL(input.website.startsWith('http') ? input.website : `https://${input.website}`)
    } catch {
      return { ok: false, error: 'That website address doesn’t look valid.' }
    }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Run, verify it passes** — `npm test -- resources` → PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/resources.ts tests/unit/resources.test.ts
git commit -m "feat: resources domain module (categories + validation)"
```

---

## Task 3: Directory list page + resource card

**Files:** Create `components/resource-card.tsx`, `app/(members)/directory/page.tsx`

- [ ] **Step 1: Write `components/resource-card.tsx`**

```tsx
import { Phone, Mail, Globe, MapPin } from 'lucide-react'
import { CATEGORY_LABELS, type Resource } from '@/lib/resources'
import { ResourceActions } from '@/components/resource-actions'

export function ResourceCard({
  resource,
  canManage,
  isAdmin,
}: {
  resource: Resource
  canManage: boolean
  isAdmin: boolean
}) {
  const r = resource
  const website = r.website
    ? r.website.startsWith('http')
      ? r.website
      : `https://${r.website}`
    : null
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-amber/15 px-3 py-1 text-xs font-medium text-amber">
          {CATEGORY_LABELS[r.category]}
        </span>
        {(canManage || isAdmin) && (
          <ResourceActions id={r.id} canEdit={canManage} canRemove={isAdmin || canManage} />
        )}
      </div>
      <h3 className="mt-3 text-lg font-semibold text-foreground">{r.business_name}</h3>
      {r.description && (
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.description}</p>
      )}
      <dl className="mt-4 space-y-1.5 text-sm text-muted-foreground">
        {r.contact_name && <div>{r.contact_name}</div>}
        {r.phone && (
          <div className="flex items-center gap-2">
            <Phone className="size-4 text-pine" /> <a href={`tel:${r.phone}`} className="hover:text-pine">{r.phone}</a>
          </div>
        )}
        {r.email && (
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-pine" /> <a href={`mailto:${r.email}`} className="hover:text-pine">{r.email}</a>
          </div>
        )}
        {website && (
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-pine" />{' '}
            <a href={website} target="_blank" rel="noreferrer" className="hover:text-pine">Website</a>
          </div>
        )}
        {r.area_served && (
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-pine" /> {r.area_served}
          </div>
        )}
      </dl>
    </div>
  )
}
```

- [ ] **Step 2: Write `app/(members)/directory/page.tsx`** (list + category filter via `?category=`)

```tsx
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES, CATEGORY_LABELS, type Category, type Resource } from '@/lib/resources'
import { buttonVariants } from '@/components/ui/button'
import { ResourceCard } from '@/components/resource-card'

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const active = CATEGORIES.includes(category as Category) ? (category as Category) : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user!.id).single<{ role: string }>()
  const isAdmin = me?.role === 'admin'

  let query = supabase.from('resources').select('*').eq('is_removed', false).order('created_at', { ascending: false })
  if (active) query = query.eq('category', active)
  const { data: resources } = await query.returns<Resource[]>()

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-pine-deep">Resource directory</h1>
          <p className="mt-2 text-muted-foreground">Trusted local services, shared by fellow owners.</p>
        </div>
        <Link href="/directory/new" className={buttonVariants()}>
          <Plus className="size-4" /> Add a resource
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/directory"
          className={`rounded-full border px-3 py-1 text-sm ${!active ? 'border-pine bg-pine text-primary-foreground' : 'border-border text-muted-foreground hover:border-pine/50'}`}
        >
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/directory?category=${c}`}
            className={`rounded-full border px-3 py-1 text-sm ${active === c ? 'border-pine bg-pine text-primary-foreground' : 'border-border text-muted-foreground hover:border-pine/50'}`}
          >
            {CATEGORY_LABELS[c]}
          </Link>
        ))}
      </div>

      {resources && resources.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              canManage={r.author_id === user!.id}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-12 text-center">
          <p className="font-display text-xl text-pine-deep">No listings yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Be the first to share a trusted provider with the community.
          </p>
          <Link href="/directory/new" className={buttonVariants({ className: 'mt-5' })}>
            <Plus className="size-4" /> Add a resource
          </Link>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Build** — `npm run build` → succeeds; `/directory` present. (ResourceActions referenced; created in Task 5 — to build now, create a temporary stub `components/resource-actions.tsx` exporting a no-op component, replaced in Task 5. OR implement Task 5 before building. Recommended: implement Task 5's component first, then build. If building now, add the stub.)

- [ ] **Step 4: Commit**
```bash
git add components/resource-card.tsx app/(members)/directory/page.tsx
git commit -m "feat: resource directory list with category filter"
```

---

## Task 4: Add-resource form + create action

**Files:** Create `app/(members)/directory/new/page.tsx`, `app/(members)/directory/actions.ts`

- [ ] **Step 1: Write `app/(members)/directory/actions.ts`** (create first; remove/delete added in Task 5 — include all three here)

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validateResource, CATEGORIES, type Category } from '@/lib/resources'

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? '').trim()
}

export async function createResource(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const input = {
    business_name: str(formData, 'business_name'),
    category: str(formData, 'category') as Category,
    description: str(formData, 'description'),
    contact_name: str(formData, 'contact_name') || null,
    phone: str(formData, 'phone') || null,
    email: str(formData, 'email') || null,
    website: str(formData, 'website') || null,
    area_served: str(formData, 'area_served') || null,
  }
  const check = validateResource(input)
  if (!check.ok) redirect('/directory/new?error=1')

  const { error } = await supabase.from('resources').insert({ ...input, author_id: user.id })
  if (error) redirect('/directory/new?error=1')

  revalidatePath('/directory')
  redirect('/directory')
}

export async function removeResource(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('resources').update({ is_removed: true }).eq('id', id)
  if (!error) revalidatePath('/directory')
}

export async function deleteResource(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('resources').delete().eq('id', id)
  if (!error) revalidatePath('/directory')
}
```

- [ ] **Step 2: Write `app/(members)/directory/new/page.tsx`** (form mirrors onboarding styling; native select)

```tsx
import Link from 'next/link'
import { createResource } from '../actions'
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/resources'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function NewResourcePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/directory" className="text-sm text-pine hover:underline">&larr; Back to directory</Link>
      <h1 className="mt-4 font-display text-3xl text-pine-deep">Add a resource</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Share a provider you trust. It publishes immediately for members to see.
      </p>
      {error && (
        <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Please add at least a business name and category (and a valid website if you include one).
        </p>
      )}
      <form action={createResource} className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-1.5">
          <Label htmlFor="business_name">Business / provider name *</Label>
          <Input id="business_name" name="business_name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Category *</Label>
          <select
            id="category" name="category" required aria-label="Category" defaultValue=""
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <option value="" disabled>Select…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">What they do</Label>
          <textarea
            id="description" name="description" rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact_name">Contact name</Label>
            <Input id="contact_name" name="contact_name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" placeholder="example.com" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="area_served">Area served</Label>
          <Input id="area_served" name="area_served" placeholder="Hidden Valley, Seven Springs…" />
        </div>
        <Button type="submit" size="lg" className="w-full">Publish to directory</Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Build** — `npm run build` → succeeds; `/directory/new` present.

- [ ] **Step 4: Commit**
```bash
git add app/(members)/directory/new/page.tsx app/(members)/directory/actions.ts
git commit -m "feat: add-resource form with auto-publish create action"
```

---

## Task 5: Owner/admin actions component

**Files:** Create `components/resource-actions.tsx`

- [ ] **Step 1: Write `components/resource-actions.tsx`** (client; owner delete + admin remove via confirm). Uses the actions from Task 4.

```tsx
'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { removeResource, deleteResource } from '@/app/(members)/directory/actions'

export function ResourceActions({
  id,
  canEdit,
  canRemove,
}: {
  id: string
  canEdit: boolean
  canRemove: boolean
}) {
  const [pending, start] = useTransition()
  if (!canRemove) return null
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label="Remove listing"
      onClick={() => {
        if (confirm('Remove this listing?')) {
          start(() => {
            // owners hard-delete their own; admins soft-remove others
            void (canEdit ? deleteResource(id) : removeResource(id))
          })
        }
      }}
    >
      <Trash2 className="size-4 text-muted-foreground" />
    </Button>
  )
}
```

- [ ] **Step 2: Build** — `npm run build` → succeeds (resolves the reference from Task 3).

- [ ] **Step 3: Commit**
```bash
git add components/resource-actions.tsx
git commit -m "feat: resource owner-delete / admin-remove actions"
```

---

## Task 6: Wire Directory into nav + home

**Files:** Modify `components/site-nav.tsx`, `app/(members)/home/page.tsx`

- [ ] **Step 1:** In `components/site-nav.tsx`, add `{ href: '/directory', label: 'Directory' }` as the first entry of the `LINKS` array (before Home? keep Home first, add Directory after Home): result order — Home, Directory, Community, Account.

- [ ] **Step 2:** In `app/(members)/home/page.tsx` `QUICK_LINKS`, add a live Directory card as the first item:
```ts
{ href: '/directory', icon: Wrench, title: 'Resource directory', body: 'Find trusted cleaners, handymen & contractors.', live: true },
```
(Import `Wrench` is already imported in home; if not, add it.)

- [ ] **Step 3: Build** — `npm run build` → succeeds.

- [ ] **Step 4: Commit**
```bash
git add components/site-nav.tsx app/(members)/home/page.tsx
git commit -m "feat: surface Directory in nav and home quick links"
```

---

## Task 7: E2E — post a resource and see it listed

**Files:** Create `tests/e2e/directory.spec.ts`

> Requires an authenticated session. Reuse the magic-link helper pattern from `tests/e2e/magic-link-flow.spec.ts` (Mailpit) when running against the LOCAL stack. If the local stack is unavailable, this test is skipped via `test.skip` guarded on `process.env.E2E_LOCAL`.

- [ ] **Step 1: Write `tests/e2e/directory.spec.ts`**

```ts
import { test, expect, request as pwRequest } from '@playwright/test'

const MAILPIT = 'http://127.0.0.1:54324'
const LOCAL = process.env.E2E_LOCAL === '1'

async function magicLink(email: string): Promise<string> {
  const api = await pwRequest.newContext()
  for (let i = 0; i < 20; i++) {
    const { messages = [] } = await (await api.get(`${MAILPIT}/api/v1/messages?limit=50`)).json()
    const m = messages.find((x: { To?: { Address: string }[] }) =>
      x.To?.some((t) => t.Address.toLowerCase() === email.toLowerCase())
    )
    if (m) {
      const msg = await (await api.get(`${MAILPIT}/api/v1/message/${m.ID}`)).json()
      const body = `${msg.Text ?? ''}\n${msg.HTML ?? ''}`.replace(/&amp;/g, '&')
      const link = body.match(/http:\/\/localhost:3100\/auth\/confirm\?[^\s"'<>]+/)?.[0]
      if (link) { await api.dispose(); return link }
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  await api.dispose()
  throw new Error('no link')
}

test.describe('directory', () => {
  test.skip(!LOCAL, 'requires local Supabase + Mailpit (set E2E_LOCAL=1)')

  test('member can publish a resource and see it', async ({ page }) => {
    const email = `dir-${Date.now()}@example.com`
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: /magic link/i }).click()
    await page.goto(await magicLink(email))
    // new user -> onboarding
    await page.getByLabel('Full name').fill('Dir Tester')
    await page.selectOption('#community', 'hidden_valley')
    await page.getByRole('button', { name: /Finish/i }).click()
    await expect(page).toHaveURL(/\/home$/)

    await page.goto('/directory/new')
    await page.getByLabel('Business / provider name *').fill('Summit Sparkle Cleaning')
    await page.selectOption('#category', 'cleaner')
    await page.getByRole('button', { name: /Publish/i }).click()

    await expect(page).toHaveURL(/\/directory$/)
    await expect(page.getByText('Summit Sparkle Cleaning')).toBeVisible()
  })
})
```

- [ ] **Step 2: Run** (local only): `E2E_LOCAL=1 npx playwright test directory` with local Supabase up → PASS. Without local stack, the test is skipped (still green).

- [ ] **Step 3: Commit**
```bash
git add tests/e2e/directory.spec.ts
git commit -m "test: e2e for publishing and listing a directory resource"
```

---

## Task 8: Deploy + production smoke test

**Files:** none

- [ ] **Step 1:** Confirm `npm run build` + `npm test` are green.
- [ ] **Step 2:** Ensure migration `0002_resources` is applied to the hosted project (Task 1, Step 2).
- [ ] **Step 3:** `vercel deploy --prod --yes`.
- [ ] **Step 4:** Smoke test: signed-out `GET /directory` → 307 to `/login` (gated). After signing in, the directory renders with the category filter and "Add a resource" CTA.

---

## Self-review

**Spec coverage:** resource directory (self-serve, auto-publish, owner-managed, admin-remove) → Tasks 1–6 ✓. Categories incl. snow_removal for the ski-area context ✓. RLS isolation matching profiles pattern ✓. Design-system consistency (Tasks 3–4 use pine/amber/Fraunces) ✓.

**Placeholder scan:** every step has full code; the only cross-task reference (`ResourceActions` in Task 3 used before Task 5) is called out with a build-ordering note. Implement Task 5's component before the first build that needs it (or use the noted stub).

**Type consistency:** `Resource`/`Category`/`CATEGORY_LABELS`/`validateResource` defined once in `lib/resources.ts` and reused in the page, card, form, and actions. Actions (`createResource`/`removeResource`/`deleteResource`) defined in Task 4 and consumed in Task 5. `is_admin()` reused from Plan 1.
