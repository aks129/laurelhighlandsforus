# Phase 1 — Plan 4: Events / Community Calls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** A members-only Events page for monthly/quarterly community calls. Admins schedule a call (title, time, description, pasted Meet link); members see upcoming & past calls, can **Join call** and **Add to Google Calendar** (link-based — no Google API), and read a recap if one is posted.

**Architecture:** An `events` table (RLS: members read, **admin-only write** via `is_admin()`). A pure `lib/events.ts` builds the Google Calendar "TEMPLATE" URL and splits upcoming/past. Server Components render; Server Actions (admin) create/delete. Recap *display* only in this plan (Gemini recap-drafting comes in Plan 5). Design uses the autumn-lodge system.

**Tech Stack:** Next.js 16, Supabase (`@supabase/ssr`), Tailwind v4 + shadcn, Vitest, Playwright.

**Hosting note:** hosted DB `ryfzzlcvnqilvrhjncvn`; migration applied via Management API.

---

## File structure

```
supabase/migrations/0004_events.sql      # events table, RLS (admin write), index
lib/events.ts                            # Event type, buildGoogleCalendarUrl, splitUpcomingPast, formatWhen — pure
components/event-card.tsx                # one event (join + add-to-calendar + recap)
components/event-admin-actions.tsx       # admin delete (client)
app/(members)/events/page.tsx            # upcoming + past sections
app/(members)/events/new/page.tsx        # admin schedule form
app/(members)/events/actions.ts          # createEvent / deleteEvent (admin)
components/site-nav.tsx                  # add Events link (modify)
app/(members)/home/page.tsx              # live Events quick-link (modify)
tests/unit/events.test.ts                # calendar URL + upcoming/past split
tests/e2e/events.spec.ts                 # admin schedules -> member sees (skipped unless E2E_LOCAL)
```

---

## Task 1: events migration

**Files:** Create `supabase/migrations/0004_events.sql`

```sql
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

-- Any signed-in member can read events.
create policy "events_select" on public.events for select
  using (auth.uid() is not null);

-- Only admins can create / update / delete events.
create policy "events_admin_insert" on public.events for insert
  with check (public.is_admin());
create policy "events_admin_update" on public.events for update
  using (public.is_admin()) with check (public.is_admin());
create policy "events_admin_delete" on public.events for delete
  using (public.is_admin());
```

- [ ] Apply to hosted via Management API (HTTP 201). Verify: 8 cols, 4 policies (select + 3 admin), RLS enabled. Commit.

---

## Task 2: events domain module (TDD)

**Files:** `lib/events.ts`; Test `tests/unit/events.test.ts`

- [ ] **Failing test** `tests/unit/events.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildGoogleCalendarUrl, splitUpcomingPast, type EventItem } from '@/lib/events'

const ev: EventItem = {
  id: '1', title: 'Monthly Owners Call', description: 'Catch up + Q&A',
  starts_at: '2026-08-15T18:00:00.000Z', ends_at: '2026-08-15T19:00:00.000Z',
  meet_url: 'https://meet.google.com/abc-defg-hij', recap: null, created_by: null,
  created_at: '2026-06-01T00:00:00.000Z',
}

describe('events domain', () => {
  it('builds a Google Calendar template URL', () => {
    const url = buildGoogleCalendarUrl(ev)
    expect(url).toContain('https://calendar.google.com/calendar/render?')
    expect(url).toContain('action=TEMPLATE')
    expect(url).toContain('dates=20260815T180000Z%2F20260815T190000Z')
    expect(url).toContain('Monthly+Owners+Call')
    expect(url).toContain('meet.google.com')
  })
  it('defaults the end to one hour after start when ends_at is null', () => {
    const url = buildGoogleCalendarUrl({ ...ev, ends_at: null })
    expect(url).toContain('dates=20260815T180000Z%2F20260815T190000Z')
  })
  it('splits events into upcoming and past relative to now', () => {
    const now = new Date('2026-08-16T00:00:00.000Z')
    const future = { ...ev, id: 'f', starts_at: '2026-09-01T18:00:00.000Z' }
    const { upcoming, past } = splitUpcomingPast([ev, future], now)
    expect(upcoming.map((e) => e.id)).toEqual(['f'])
    expect(past.map((e) => e.id)).toEqual(['1'])
  })
})
```

- [ ] **Implement** `lib/events.ts`:

```ts
export interface EventItem {
  id: string
  title: string
  description: string
  starts_at: string
  ends_at: string | null
  meet_url: string | null
  recap: string | null
  created_by: string | null
  created_at: string
}

function toCalDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function buildGoogleCalendarUrl(event: EventItem): string {
  const start = toCalDate(event.starts_at)
  const endIso = event.ends_at ?? new Date(new Date(event.starts_at).getTime() + 3_600_000).toISOString()
  const end = toCalDate(endIso)
  const details = [event.description, event.meet_url ? `Join the call: ${event.meet_url}` : '']
    .filter(Boolean)
    .join('\n\n')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details,
    location: event.meet_url ?? '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function splitUpcomingPast(
  events: EventItem[],
  now: Date = new Date()
): { upcoming: EventItem[]; past: EventItem[] } {
  const upcoming: EventItem[] = []
  const past: EventItem[] = []
  for (const e of events) {
    if (new Date(e.starts_at).getTime() >= now.getTime()) upcoming.push(e)
    else past.push(e)
  }
  upcoming.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  past.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
  return { upcoming, past }
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })
}
```

- [ ] Run → PASS. Commit.

---

## Task 3: event card + events page

**Files:** `components/event-card.tsx`, `app/(members)/events/page.tsx`

- [ ] **`components/event-card.tsx`** (Join call + Add to Calendar + recap):

```tsx
import { Video, CalendarPlus } from 'lucide-react'
import { buildGoogleCalendarUrl, formatWhen, type EventItem } from '@/lib/events'
import { buttonVariants } from '@/components/ui/button'
import { EventAdminActions } from '@/components/event-admin-actions'

export function EventCard({
  event,
  isPast,
  isAdmin,
}: {
  event: EventItem
  isPast: boolean
  isAdmin: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-amber">{formatWhen(event.starts_at)}</p>
          <h3 className="mt-1 text-xl font-semibold text-foreground">{event.title}</h3>
        </div>
        {isAdmin && <EventAdminActions id={event.id} />}
      </div>
      {event.description && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{event.description}</p>
      )}
      {!isPast && (
        <div className="mt-5 flex flex-wrap gap-3">
          {event.meet_url && (
            <a href={event.meet_url} target="_blank" rel="noreferrer" className={buttonVariants({ size: 'sm' })}>
              <Video className="size-4" /> Join call
            </a>
          )}
          <a
            href={buildGoogleCalendarUrl(event)}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <CalendarPlus className="size-4" /> Add to Google Calendar
          </a>
        </div>
      )}
      {event.recap && (
        <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber">Recap</p>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{event.recap}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **`app/(members)/events/page.tsx`**:

```tsx
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { splitUpcomingPast, type EventItem } from '@/lib/events'
import { buttonVariants } from '@/components/ui/button'
import { EventCard } from '@/components/event-card'

export default async function EventsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user!.id).single<{ role: string }>()
  const isAdmin = me?.role === 'admin'

  const { data: events } = await supabase.from('events').select('*').returns<EventItem[]>()
  const { upcoming, past } = splitUpcomingPast(events ?? [])

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-pine-deep">Community calls</h1>
          <p className="mt-2 text-muted-foreground">Monthly & quarterly calls for owners. Everyone&rsquo;s welcome.</p>
        </div>
        {isAdmin && (
          <Link href="/events/new" className={buttonVariants()}>
            <Plus className="size-4" /> Schedule a call
          </Link>
        )}
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-pine-deep">Upcoming</h2>
        {upcoming.length ? (
          <div className="space-y-4">
            {upcoming.map((e) => <EventCard key={e.id} event={e} isPast={false} isAdmin={isAdmin} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center">
            <p className="font-display text-lg text-pine-deep">No calls on the calendar yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {isAdmin ? 'Schedule the first community call.' : 'Check back soon — the next call will appear here.'}
            </p>
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-pine-deep">Past calls</h2>
          <div className="space-y-4">
            {past.map((e) => <EventCard key={e.id} event={e} isPast isAdmin={isAdmin} />)}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] Build (needs `EventAdminActions` from Task 5 — implement Task 5 first or stub). Commit.

---

## Task 4: admin schedule form + actions

**Files:** `app/(members)/events/actions.ts`, `app/(members)/events/new/page.tsx`

- [ ] **`app/(members)/events/actions.ts`** (guards admin):

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (me?.role !== 'admin') redirect('/events')
  return { supabase, user }
}

export async function createEvent(formData: FormData) {
  const { supabase, user } = await requireAdmin()
  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const startsLocal = String(formData.get('starts_at') ?? '').trim() // datetime-local
  const meet_url = String(formData.get('meet_url') ?? '').trim() || null

  if (!title || !startsLocal) redirect('/events/new?error=1')
  const starts_at = new Date(startsLocal).toISOString()

  const { error } = await supabase
    .from('events')
    .insert({ title, description, starts_at, meet_url, created_by: user.id })
  if (error) redirect('/events/new?error=1')

  revalidatePath('/events')
  redirect('/events')
}

export async function deleteEvent(id: string) {
  const { supabase } = await requireAdmin()
  await supabase.from('events').delete().eq('id', id)
  revalidatePath('/events')
}
```

- [ ] **`app/(members)/events/new/page.tsx`** (admin only; redirect non-admins):

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createEvent } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user!.id).single<{ role: string }>()
  if (me?.role !== 'admin') redirect('/events')

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/events" className="text-sm text-pine hover:underline">&larr; Back to calls</Link>
      <h1 className="mt-4 font-display text-3xl text-pine-deep">Schedule a call</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create a Meet link (meet.google.com/new) and paste it below — members get Join + Add-to-Calendar buttons.
      </p>
      {error && (
        <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Please add a title and a date/time.
        </p>
      )}
      <form action={createEvent} className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" name="title" required placeholder="Monthly Owners Call" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="starts_at">Date & time *</Label>
          <Input id="starts_at" name="starts_at" type="datetime-local" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meet_url">Meet link</Label>
          <Input id="meet_url" name="meet_url" placeholder="https://meet.google.com/abc-defg-hij" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Agenda / notes</Label>
          <textarea id="description" name="description" rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none" />
        </div>
        <Button type="submit" size="lg" className="w-full">Schedule call</Button>
      </form>
    </div>
  )
}
```

- [ ] Build. Commit.

---

## Task 5: admin actions component

**Files:** `components/event-admin-actions.tsx`

```tsx
'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteEvent } from '@/app/(members)/events/actions'

export function EventAdminActions({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label="Delete event"
      onClick={() => {
        if (confirm('Delete this call?')) start(() => void deleteEvent(id))
      }}
    >
      <Trash2 className="size-4 text-muted-foreground" />
    </Button>
  )
}
```

- [ ] Build (resolves Task 3 reference). Commit.

---

## Task 6: wire into nav + home

- [ ] `components/site-nav.tsx` — add `{ href: '/events', label: 'Calls' }` after Free Pile.
- [ ] `app/(members)/home/page.tsx` — add live quick-link `{ href: '/events', icon: CalendarDays, title: 'Community calls', body: 'Join the next call & add it to your calendar.', live: true }`; remove "Community calls" from `COMING` (CalendarDays already imported). Build. Commit.

---

## Task 7: E2E (skipped unless local)

`tests/e2e/events.spec.ts` — guarded by `E2E_LOCAL`. Sign in as a user, promote to admin (service-role helper via the test harness is out of scope; instead this test asserts the **non-admin** view: `/events` shows "No calls on the calendar yet" and NO "Schedule a call" button). Keeps it runnable without admin plumbing. Commit.

---

## Task 8: deploy + smoke test

- [ ] `npm run build` + `npm test` green; migration `0004` applied.
- [ ] `vercel deploy --prod --yes`.
- [ ] Smoke: signed-out `/events` → 307 `/login`. Authenticated non-admin sees calls but no schedule button; admin can schedule, and the event shows Join + Add-to-Calendar.

---

## Self-review

**Spec coverage:** events/community calls, admin-scheduled, member view, Meet link + link-based Add-to-Google-Calendar (no API), recap display → Tasks 1–6 ✓. Admin-only writes via `is_admin()` RLS ✓. (Gemini recap drafting deferred to Plan 5.)

**Placeholder scan:** full code throughout; `EventAdminActions` forward reference flagged.

**Type consistency:** `EventItem`/`buildGoogleCalendarUrl`/`splitUpcomingPast`/`formatWhen` defined once in `lib/events.ts`; `createEvent`/`deleteEvent` in Task 4 consumed by Task 5 + page. `is_admin()` reused.
