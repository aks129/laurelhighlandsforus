# Phase 1 — Plan 1: Foundation (Scaffold + Auth + Profiles) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js + Supabase + Vercel website with a public landing page, magic-link + Google login, a member profile/onboarding flow, gated member routes, and the base app shell — so an owner can sign in and land on a (currently empty) members home.

**Architecture:** Next.js App Router with two route groups: `(public)` (landing, login, auth) and `(members)` (everything gated). Supabase provides Auth (magic link + Google) and Postgres. A `proxy`/middleware refreshes the session and redirects anonymous users to `/login`; the members layout redirects un-onboarded users to `/onboarding`. A `profiles` table (auto-created by a DB trigger on signup) holds member info, protected by RLS.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, `@supabase/ssr` + `@supabase/supabase-js`, Supabase CLI (local dev/migrations), Vitest + @testing-library (unit), Playwright (E2E).

**Spec:** `docs/superpowers/specs/2026-06-03-laurel-highlands-owner-community-phase-1-design.md`

---

## File structure (created by this plan)

```
app/
  layout.tsx                      # root layout (fonts, globals)
  globals.css
  (public)/
    page.tsx                      # landing page  (route: /)
    login/page.tsx                # login form (magic link + Google)
    auth/callback/route.ts        # OAuth/code exchange handler
    auth/confirm/route.ts         # magic-link (OTP) verification handler
    auth/auth-code-error/page.tsx # auth error fallback
  (members)/
    layout.tsx                    # gated shell: nav + onboarding gate
    home/page.tsx                 # members home (route: /home)
    onboarding/page.tsx           # profile completion form
    account/page.tsx              # view/edit own profile
    community/page.tsx            # Slack invite link
components/
  ui/...                          # shadcn components (button, input, etc.)
  site-nav.tsx                    # top nav (public vs member aware)
  sign-out-button.tsx
lib/
  supabase/server.ts              # server Supabase client
  lib/supabase/client.ts          # browser Supabase client
  auth/public-paths.ts            # isPublicPath() — pure
  profile.ts                      # Profile type + isProfileComplete() — pure
  env.ts                          # typed env access
proxy.ts                          # session refresh + anonymous redirect (Next middleware)
supabase/
  migrations/0001_profiles.sql    # profiles table, role, RLS, is_admin(), signup trigger
tests/
  unit/public-paths.test.ts
  unit/profile.test.ts
  e2e/auth-gating.spec.ts
vitest.config.ts
playwright.config.ts
```

---

## Task 1: Scaffold the Next.js app

**Files:**
- Create: whole Next.js project at repo root.

- [ ] **Step 1: Scaffold into a temp dir, then move into the repo root**

The repo already has `LICENSE`, `.gitattributes`, `.git/`, and `docs/`. `create-next-app` needs an empty-ish dir, so scaffold into a temp dir and copy in.

Run:
```bash
cd /Users/eugenevestel/Documents/GitHub/laurelhighlandsforus
npx --yes create-next-app@latest .nextapp-tmp \
  --typescript --tailwind --eslint --app --src-dir=false \
  --import-alias "@/*" --use-npm --no-turbopack
# move generated files into repo root (including dotfiles), then clean up
shopt -s dotglob
mv .nextapp-tmp/* .
rm -rf .nextapp-tmp
shopt -u dotglob
```
Expected: `package.json`, `app/`, `next.config.*`, `tsconfig.json`, `tailwind` config, `app/globals.css` now exist at repo root.

- [ ] **Step 2: Merge .gitignore**

Open the generated `.gitignore` and confirm it contains `node_modules`, `.next`, `.env*`. Add these lines if missing:
```
# local env
.env.local
.env.test.local
# supabase
supabase/.branches
supabase/.temp
# playwright
/test-results/
/playwright-report/
```

- [ ] **Step 3: Verify it builds**

Run: `npm run build`
Expected: build completes with no errors (a default home page is generated).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app (App Router, TS, Tailwind)"
```

---

## Task 2: Install dependencies (Supabase, test tooling)

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime + dev dependencies**

Run:
```bash
npm install @supabase/ssr @supabase/supabase-js
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Add test scripts to package.json**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add supabase, vitest, and playwright dependencies"
```

---

## Task 3: Configure Vitest and prove the harness

**Files:**
- Create: `vitest.config.ts`, `tests/unit/smoke.test.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 2: Write a smoke test**

`tests/unit/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 3: Run it**

Run: `npm test`
Expected: PASS — 1 passed.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts tests/unit/smoke.test.ts
git commit -m "test: configure vitest harness"
```

---

## Task 4: Typed env access

**Files:**
- Create: `lib/env.ts`, `.env.local.example`

- [ ] **Step 1: Write `lib/env.ts`**

```ts
// Centralized, typed access to public env vars used on the client + server.
// Server-only secrets (service role key) are read directly where needed, never here.
function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  slackInviteUrl: process.env.NEXT_PUBLIC_SLACK_INVITE_URL ?? '',
}
```

- [ ] **Step 2: Write `.env.local.example`** (committed; real `.env.local` is gitignored)

```
# Supabase (from `supabase start` for local, or the project dashboard for prod)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-local-service-role-key

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Community
NEXT_PUBLIC_SLACK_INVITE_URL=
```

- [ ] **Step 3: Commit**

```bash
git add lib/env.ts .env.local.example
git commit -m "feat: typed env access + example env file"
```

---

## Task 5: Supabase clients (browser + server)

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`

- [ ] **Step 1: Write the browser client `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'

export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey)
}
```

- [ ] **Step 2: Write the server client `lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from a Server Component — safe to ignore; the proxy refreshes cookies.
        }
      },
    },
  })
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts
git commit -m "feat: supabase browser and server clients"
```

---

## Task 6: Local Supabase + profiles migration (table, role, RLS, trigger)

**Files:**
- Create: `supabase/migrations/0001_profiles.sql`, `supabase/config.toml` (generated by init)

- [ ] **Step 1: Initialize and start local Supabase**

Run:
```bash
npx --yes supabase init
npx --yes supabase start
```
Expected: prints local `API URL` (http://127.0.0.1:54321), `anon key`, and `service_role key`. Copy these into `.env.local` (create it from `.env.local.example`).

- [ ] **Step 2: Write the migration `supabase/migrations/0001_profiles.sql`**

```sql
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

-- A member can update their own profile (role changes are not done via the app).
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

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
```

- [ ] **Step 3: Apply the migration locally**

Run: `npx supabase migration up`
Expected: migration `0001_profiles` applied; no errors.

- [ ] **Step 4: Verify the schema**

Run: `npx supabase db reset` (re-applies all migrations from scratch)
Expected: completes cleanly, `0001_profiles` applied.

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: profiles table with role, RLS, is_admin(), and signup trigger"
```

---

## Task 7: Public-paths helper (TDD)

**Files:**
- Create: `lib/auth/public-paths.ts`
- Test: `tests/unit/public-paths.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/public-paths.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isPublicPath } from '@/lib/auth/public-paths'

describe('isPublicPath', () => {
  it('treats the landing page as public', () => {
    expect(isPublicPath('/')).toBe(true)
  })
  it('treats login and auth routes as public', () => {
    expect(isPublicPath('/login')).toBe(true)
    expect(isPublicPath('/auth/callback')).toBe(true)
    expect(isPublicPath('/auth/confirm')).toBe(true)
  })
  it('treats member routes as private', () => {
    expect(isPublicPath('/home')).toBe(false)
    expect(isPublicPath('/account')).toBe(false)
    expect(isPublicPath('/onboarding')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- public-paths`
Expected: FAIL — cannot find module `@/lib/auth/public-paths`.

- [ ] **Step 3: Implement `lib/auth/public-paths.ts`**

```ts
const PUBLIC_PREFIXES = ['/login', '/auth']

export function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- public-paths`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/public-paths.ts tests/unit/public-paths.test.ts
git commit -m "feat: isPublicPath helper for route gating"
```

---

## Task 8: Profile type + completeness check (TDD)

**Files:**
- Create: `lib/profile.ts`
- Test: `tests/unit/profile.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/profile.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isProfileComplete, type Profile } from '@/lib/profile'

const base: Profile = {
  id: 'u1',
  email: 'a@b.com',
  full_name: null,
  phone: null,
  community: null,
  num_properties: null,
  role: 'member',
  onboarded: false,
  created_at: '2026-06-03T00:00:00Z',
}

describe('isProfileComplete', () => {
  it('is false when full_name or community is missing', () => {
    expect(isProfileComplete(base)).toBe(false)
    expect(isProfileComplete({ ...base, full_name: 'Jane' })).toBe(false)
    expect(isProfileComplete({ ...base, community: 'hidden_valley' })).toBe(false)
  })
  it('is true when full_name and community are present', () => {
    expect(isProfileComplete({ ...base, full_name: 'Jane', community: 'hidden_valley' })).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- profile`
Expected: FAIL — cannot find module `@/lib/profile`.

- [ ] **Step 3: Implement `lib/profile.ts`**

```ts
export type Community = 'hidden_valley' | 'seven_springs' | 'other'
export type Role = 'member' | 'admin'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  community: Community | null
  num_properties: number | null
  role: Role
  onboarded: boolean
  created_at: string
}

export function isProfileComplete(profile: Profile): boolean {
  return Boolean(profile.full_name && profile.community)
}

export const COMMUNITY_LABELS: Record<Community, string> = {
  hidden_valley: 'Hidden Valley',
  seven_springs: 'Seven Springs',
  other: 'Other',
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- profile`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/profile.ts tests/unit/profile.test.ts
git commit -m "feat: Profile type and isProfileComplete check"
```

---

## Task 9: Proxy/middleware — session refresh + anonymous redirect

**Files:**
- Create: `proxy.ts` (Next.js middleware file at repo root)

- [ ] **Step 1: Write `proxy.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isPublicPath } from '@/lib/auth/public-paths'
import { env } from '@/lib/env'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

> Note: this project uses the filename `proxy.ts`. If your Next.js version expects `middleware.ts`, rename the file accordingly — the contents are identical.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat: proxy refreshes session and redirects anonymous users to /login"
```

---

## Task 10: Root layout + base UI (shadcn) + globals

**Files:**
- Modify: `app/layout.tsx`, `app/globals.css`
- Create: shadcn config + `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/card.tsx`, `components/ui/select.tsx`

- [ ] **Step 1: Initialize shadcn/ui**

Run:
```bash
npx --yes shadcn@latest init -d
npx --yes shadcn@latest add button input label card select
```
Expected: `components/ui/*` created; `components.json` added; `app/globals.css` updated with CSS variables.

- [ ] **Step 2: Set root layout metadata**

Replace `app/layout.tsx` body metadata so the title reflects the project. Ensure it remains a valid root layout:
```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Laurel Highlands For Us',
  description: 'A community for Laurel Highlands rental owners and Airbnb operators.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: builds successfully.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: shadcn ui base components and root layout"
```

---

## Task 11: Landing page (public)

**Files:**
- Create: `app/(public)/page.tsx`
- Delete: the default `app/page.tsx` generated by create-next-app (moved into the route group)

- [ ] **Step 1: Remove the default home page**

Run: `git rm app/page.tsx`
(If it was already overwritten, just ensure no `app/page.tsx` remains so the `(public)` group owns `/`.)

- [ ] **Step 2: Write `app/(public)/page.tsx`**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Laurel Highlands For Us</h1>
        <p className="text-lg text-muted-foreground">
          A community for rental owners and Airbnb operators around Hidden Valley and Seven Springs.
          Share trusted cleaners and handymen, pass along surplus items, join monthly calls, and stop
          going it alone.
        </p>
      </div>
      <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
        <li>A directory of vetted local service providers</li>
        <li>A &ldquo;free pile&rdquo; for furniture and supplies between owners</li>
        <li>Monthly &amp; quarterly community calls</li>
        <li>A members-only Slack and an AI hosting helper (coming soon)</li>
      </ul>
      <div>
        <Button asChild size="lg">
          <Link href="/login">Join the community</Link>
        </Button>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: builds; route `/` is served by the `(public)` group.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: public landing page"
```

---

## Task 12: Login page (magic link + Google)

**Files:**
- Create: `app/(public)/login/page.tsx`, `components/login-form.tsx`

- [ ] **Step 1: Write the client login form `components/login-form.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const supabase = createClient()
  const siteUrl =
    typeof window !== 'undefined' ? window.location.origin : ''

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=/home` },
    })
    setStatus(error ? 'error' : 'sent')
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${siteUrl}/auth/callback?next=/home` },
    })
  }

  return (
    <div className="space-y-6">
      <form onSubmit={sendMagicLink} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <Button type="submit" className="w-full" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Email me a magic link'}
        </Button>
        {status === 'sent' && (
          <p className="text-sm text-green-600">Check your inbox for a sign-in link.</p>
        )}
        {status === 'error' && (
          <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
        )}
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" className="w-full" onClick={signInWithGoogle}>
        Continue with Google
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Write the login page `app/(public)/login/page.tsx`**

```tsx
import { LoginForm } from '@/components/login-form'
import { Card, CardContent, Cardheader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sign in to Laurel Highlands For Us</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  )
}
```

> Note: import is `CardHeader` (capital H). Match the export names from the shadcn `card.tsx` generated in Task 10.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: builds; `/login` renders the form.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: login page with magic link and Google sign-in"
```

---

## Task 13: Auth handlers (callback + magic-link confirm + error page)

**Files:**
- Create: `app/(public)/auth/callback/route.ts`, `app/(public)/auth/confirm/route.ts`, `app/(public)/auth/auth-code-error/page.tsx`

- [ ] **Step 1: Write the OAuth callback `app/(public)/auth/callback/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/home'
  if (!next.startsWith('/')) next = '/home'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) return NextResponse.redirect(`${origin}${next}`)
      if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${next}`)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

- [ ] **Step 2: Write the magic-link confirm handler `app/(public)/auth/confirm/route.ts`**

```ts
import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/home'

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next.startsWith('/') ? next : '/home'
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) return NextResponse.redirect(redirectTo)
  }

  redirectTo.pathname = '/auth/auth-code-error'
  return NextResponse.redirect(redirectTo)
}
```

- [ ] **Step 3: Write the error page `app/(public)/auth/auth-code-error/page.tsx`**

```tsx
import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Sign-in link problem</h1>
      <p className="text-muted-foreground">
        That sign-in link was invalid or expired. Please request a new one.
      </p>
      <Link href="/login" className="underline">
        Back to sign in
      </Link>
    </main>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: builds; the three auth routes compile.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: auth callback, magic-link confirm, and error page"
```

---

## Task 14: Members layout (nav + onboarding gate) + sign out

**Files:**
- Create: `app/(members)/layout.tsx`, `components/site-nav.tsx`, `components/sign-out-button.tsx`

- [ ] **Step 1: Write the sign-out button `components/sign-out-button.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" onClick={signOut}>
      Sign out
    </Button>
  )
}
```

- [ ] **Step 2: Write the nav `components/site-nav.tsx`**

```tsx
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'

const LINKS = [
  { href: '/home', label: 'Home' },
  { href: '/community', label: 'Community' },
  { href: '/account', label: 'Account' },
]

export function SiteNav({ isAdmin }: { isAdmin: boolean }) {
  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/home" className="font-semibold">
          Laurel Highlands For Us
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" className="text-muted-foreground hover:text-foreground">
              Admin
            </Link>
          )}
          <SignOutButton />
        </div>
      </nav>
    </header>
  )
}
```

- [ ] **Step 3: Write the gated layout `app/(members)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SiteNav } from '@/components/site-nav'
import { isProfileComplete, type Profile } from '@/lib/profile'

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  // First-time members must complete onboarding before using the app.
  if (profile && !isProfileComplete(profile)) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen">
      <SiteNav isAdmin={profile?.role === 'admin'} />
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  )
}
```

> Note: `/onboarding` lives in the `(members)` group too, so it would also hit this gate. To avoid a redirect loop, the onboarding page (Task 16) renders its own minimal shell — but the gate above redirects *to* `/onboarding`, and the onboarding page itself does not re-run this check because it sets `onboarded`/profile fields. The loop is prevented because once `full_name` + `community` are set, `isProfileComplete` returns true. While incomplete, repeatedly landing on `/onboarding` is the intended state (no loop: redirect target == current path is a no-op in Next).

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: builds (pages referenced like `/home`, `/account`, `/onboarding`, `/community` come in the next tasks; build may warn about missing routes only at runtime, not build time — proceed).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: gated members layout, nav, and sign-out"
```

---

## Task 15: Members home + Community (Slack) + Account pages

**Files:**
- Create: `app/(members)/home/page.tsx`, `app/(members)/community/page.tsx`, `app/(members)/account/page.tsx`

- [ ] **Step 1: Write `app/(members)/home/page.tsx`**

```tsx
export default function HomePage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="text-muted-foreground">
        This is your community home. The directory, classifieds, events, and assistant are coming soon.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Write `app/(members)/community/page.tsx`**

```tsx
import { Button } from '@/components/ui/button'
import { env } from '@/lib/env'

export default function CommunityPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Community Slack</h1>
      <p className="text-muted-foreground">
        Our day-to-day conversations happen in Slack — ask questions, share wins, and coordinate.
      </p>
      {env.slackInviteUrl ? (
        <Button asChild>
          <a href={env.slackInviteUrl} target="_blank" rel="noreferrer">
            Join the Slack
          </a>
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">The Slack invite link will appear here soon.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write `app/(members)/account/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { COMMUNITY_LABELS, type Profile } from '@/lib/profile'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single<Profile>()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Your account</h1>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Name</dt>
          <dd>{profile?.full_name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd>{profile?.email ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Community</dt>
          <dd>{profile?.community ? COMMUNITY_LABELS[profile.community] : '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Properties</dt>
          <dd>{profile?.num_properties ?? '—'}</dd>
        </div>
      </dl>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: builds successfully.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: members home, community (Slack), and account pages"
```

---

## Task 16: Onboarding page + server action

**Files:**
- Create: `app/(members)/onboarding/page.tsx`, `app/(members)/onboarding/actions.ts`

- [ ] **Step 1: Write the server action `app/(members)/onboarding/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Community } from '@/lib/profile'

const COMMUNITIES: Community[] = ['hidden_valley', 'seven_springs', 'other']

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const full_name = String(formData.get('full_name') ?? '').trim()
  const communityRaw = String(formData.get('community') ?? '')
  const phone = String(formData.get('phone') ?? '').trim() || null
  const numRaw = String(formData.get('num_properties') ?? '').trim()

  if (!full_name || !COMMUNITIES.includes(communityRaw as Community)) {
    redirect('/onboarding?error=1')
  }

  const num_properties = numRaw === '' ? null : Math.max(0, Number.parseInt(numRaw, 10) || 0)

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name,
      community: communityRaw as Community,
      phone,
      num_properties,
      onboarded: true,
    })
    .eq('id', user.id)

  if (error) redirect('/onboarding?error=1')

  revalidatePath('/home')
  redirect('/home')
}
```

- [ ] **Step 2: Write the onboarding page `app/(members)/onboarding/page.tsx`**

```tsx
import { completeOnboarding } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Welcome — tell us about you</h1>
        <p className="text-sm text-muted-foreground">Just a few details to set up your profile.</p>
      </div>
      {error && <p className="text-sm text-red-600">Please enter your name and pick a community.</p>}
      <form action={completeOnboarding} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="community">Community</Label>
          <select
            id="community"
            name="community"
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Select…
            </option>
            <option value="hidden_valley">Hidden Valley</option>
            <option value="seven_springs">Seven Springs</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" name="phone" type="tel" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="num_properties">Number of properties (optional)</Label>
          <Input id="num_properties" name="num_properties" type="number" min={0} />
        </div>
        <Button type="submit" className="w-full">
          Finish
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: builds successfully.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: onboarding form and profile completion server action"
```

---

## Task 17: Seed the admin account (Eugene)

**Files:**
- Create: `supabase/seed-admin.sql` (a helper you run after first login)

- [ ] **Step 1: Write `supabase/seed-admin.sql`**

```sql
-- Run AFTER signing in once with eugene.vestel@gmail.com so the profile row exists.
-- Promotes that account to admin. Update the email if needed.
update public.profiles
set role = 'admin'
where email = 'eugene.vestel@gmail.com';
```

- [ ] **Step 2: Document how to run it** (no execution yet — there's no signed-in user during the build)

Add to the plan's manual-verification notes: after first login on local, run
`psql "$(npx supabase status --output env | grep DB_URL | cut -d= -f2-)" -f supabase/seed-admin.sql`
or paste the SQL into Supabase Studio (local: http://127.0.0.1:54323).

- [ ] **Step 3: Commit**

```bash
git add supabase/seed-admin.sql
git commit -m "chore: admin-promotion seed script"
```

---

## Task 18: E2E — auth gating and public pages (Playwright)

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/auth-gating.spec.ts`

- [ ] **Step 1: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

- [ ] **Step 2: Write the failing E2E test `tests/e2e/auth-gating.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('landing page shows the join CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Laurel Highlands For Us' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Join the community' })).toBeVisible()
})

test('login page shows magic link and Google options', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByRole('button', { name: /magic link/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible()
})

test('anonymous visit to a gated route redirects to login', async ({ page }) => {
  await page.goto('/home')
  await expect(page).toHaveURL(/\/login$/)
})
```

- [ ] **Step 3: Ensure local Supabase is running and `.env.local` is set**

Run: `npx supabase status`
Expected: services are running. If not, run `npx supabase start` and confirm `.env.local` has the local URL + anon key (from Task 6).

- [ ] **Step 4: Run the E2E tests**

Run: `npm run test:e2e`
Expected: all three tests PASS. (The dev server is auto-started by Playwright's `webServer`.)

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/auth-gating.spec.ts
git commit -m "test: e2e for landing, login, and auth gating"
```

---

## Task 19: Manual verification of the full auth round-trip

**Files:** none (manual)

- [ ] **Step 1: Configure Google OAuth (local)**

In Supabase Studio (local: http://127.0.0.1:54323) → Authentication → Providers → Google, add a Google OAuth Client ID/secret (from Google Cloud Console; authorized redirect `http://127.0.0.1:54321/auth/v1/callback`). For purely-local magic-link testing you can skip Google and use Inbucket.

- [ ] **Step 2: Test magic link locally**

Run `npm run dev`, go to http://localhost:3000/login, enter an email, submit. Open the local mailbox (Inbucket, http://127.0.0.1:54324), click the link.
Expected: redirected to `/onboarding` (new user), complete the form, land on `/home`.

- [ ] **Step 3: Promote yourself to admin**

Run the `supabase/seed-admin.sql` from Task 17 (use your test email). Reload `/home`.
Expected: the **Admin** link now appears in the nav.

- [ ] **Step 4: Confirm sign-out**

Click **Sign out**.
Expected: redirected to `/`; visiting `/home` now redirects to `/login`.

---

## Task 20: Deploy to Vercel + production Supabase (optional but recommended now)

**Files:** none (platform config)

- [ ] **Step 1: Create a hosted Supabase project**

Create a project at supabase.com, then link and push migrations:
```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```
Expected: `0001_profiles` applied to the hosted DB.

- [ ] **Step 2: Configure Google provider + redirect URLs on the hosted project**

In the hosted dashboard → Authentication → URL Configuration, set Site URL to your Vercel domain and add `https://<domain>/auth/callback` and `https://<domain>/auth/confirm` to redirect allow-list. Add the Google provider credentials.

- [ ] **Step 3: Deploy on Vercel**

Import the GitHub repo in Vercel. Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (the prod domain), `NEXT_PUBLIC_SLACK_INVITE_URL`. Deploy.
Expected: landing page live; magic-link + Google sign-in work end-to-end on the deployed URL.

- [ ] **Step 4: Promote the admin on production**

Sign in once on production with `eugene.vestel@gmail.com`, then run `supabase/seed-admin.sql` against the hosted DB (Studio SQL editor).
Expected: Admin link appears.

---

## Self-review

**Spec coverage (Plan 1 portion):**
- Public landing + email-capture-via-join → Tasks 11, 12. ✓
- Magic link + Google login → Tasks 12, 13, 19. ✓
- Member accounts + profiles + onboarding (name, community, phone, # properties) → Tasks 6, 16. ✓
- Member vs admin roles + `is_admin()` → Task 6; admin link gating → Task 14; admin seed → Task 17. ✓
- Gated routes / login required → Tasks 9, 14, 18. ✓
- Community (Slack) link → Task 15. ✓
- Stack: Next.js + Supabase + Vercel → Tasks 1, 5, 6, 20. ✓
- RLS at DB layer → Task 6. ✓
- *Deferred to later plans (not in Plan 1, as intended):* directory (Plan 2), classifieds (Plan 3), events/Meet/calendar (Plan 4), Gemini assistant (Plan 5), admin moderation dashboard + recap drafting (Plans 2–5 + 6). ✓

**Placeholder scan:** No "TBD"/"implement later" steps; every code step shows full code. ✓

**Type consistency:** `Profile`/`Community`/`Role` defined once in `lib/profile.ts` and reused in layout, account, onboarding action; `isProfileComplete` and `isPublicPath` signatures match their tests; `createClient()` (server: async; browser: sync) used consistently; nav prop `isAdmin` matches the `profile.role === 'admin'` source. ✓

**Note for executor:** Tasks 1, 2, 6, 10 are setup/scaffold steps (verified by build/CLI rather than unit tests); Tasks 7 and 8 are pure-logic TDD; auth/UI is verified by the Playwright E2E (Task 18) and the manual round-trip (Task 19). Local Supabase (Docker) must be running for Tasks 6, 18, and 19.
