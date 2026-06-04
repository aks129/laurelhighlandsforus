# Phase 1 — Plan 6: Admin Dashboard + Polish Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans.

**Goal:** A consolidated `/admin` dashboard (admin-only) with at-a-glance stats and a members list where the admin can promote/demote members. Also fixes the dangling "Admin" nav link (route didn't exist) and adds a polished 404 page.

**Architecture:** `/admin` is an admin-gated Server Component (redirect non-admins). Stats are `count` queries; the members table reads all profiles (the existing `profiles` admin SELECT policy already permits `is_admin()`). Role changes go through a service-role Server Action (admin-gated in code; can't be done via the "update own" RLS), with a guard preventing self-demotion (no admin lockout).

**Tech Stack:** Next.js 16, Supabase (`@supabase/ssr` + service-role for role writes), Tailwind v4 + shadcn.

**No migration needed.**

---

## File structure

```
app/(members)/admin/page.tsx       # dashboard: stats + members table (admin-gated)
app/(members)/admin/actions.ts     # setRole (service-role, admin-gated, self-demotion guard)
components/role-toggle.tsx         # client: promote/demote a member
app/not-found.tsx                  # polished 404
```

---

## Task 1: role-management action

`app/(members)/admin/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

export async function setRole(userId: string, role: 'member' | 'admin') {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (me?.role !== 'admin') redirect('/home')

  // Don't let an admin demote themselves (avoids locking out the last admin).
  if (userId === user.id && role !== 'admin') return

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return
  const svc = createSupabaseClient(env.supabaseUrl, serviceKey, { auth: { persistSession: false } })
  await svc.from('profiles').update({ role }).eq('id', userId)
  revalidatePath('/admin')
}
```

---

## Task 2: role toggle (client)

`components/role-toggle.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { setRole } from '@/app/(members)/admin/actions'

export function RoleToggle({ userId, role, isSelf }: { userId: string; role: 'member' | 'admin'; isSelf: boolean }) {
  const [pending, start] = useTransition()
  if (isSelf) return <span className="text-xs text-muted-foreground">You</span>
  const next = role === 'admin' ? 'member' : 'admin'
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => start(() => void setRole(userId, next))}
    >
      {role === 'admin' ? 'Make member' : 'Make admin'}
    </Button>
  )
}
```

---

## Task 3: admin dashboard page

`app/(members)/admin/page.tsx` (admin-gated; stats cards + members table). Uses `count` queries and `COMMUNITY_LABELS`. Layout consistent with the design system. Members table columns: Name, Email, Community, Properties, Joined, Role + toggle. Stats: Members, Resources, Classifieds, Upcoming calls.

(Implementer: build the page; redirect non-admins to `/home`. Use `head:true, count:'exact'` queries for stats; `profiles` select ordered by `created_at`.)

---

## Task 4: polished 404

`app/not-found.tsx` — on-brand not-found with a link home (cream background, Fraunces heading, a "Back home" button).

---

## Task 5: build + deploy

- `npm run build` + `npm test` green.
- Authenticated screenshot of `/admin` (as admin) showing stats + members + toggle.
- `vercel deploy --prod --yes`; smoke: `/admin` signed-out → 307 `/login`; non-admin → redirect `/home`.

---

## Self-review

**Spec coverage:** consolidated admin area (members + moderation entrypoint) ✓; fixes dangling Admin link ✓; role management (a real admin need) ✓ with self-demotion guard. **Placeholder scan:** action + toggle have full code; the page is described with exact columns/queries. **Type consistency:** `setRole(userId, 'member'|'admin')` shared between action + toggle; service-role pattern reused from classifieds upload.
