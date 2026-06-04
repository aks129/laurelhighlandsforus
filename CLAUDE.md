# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

**Laurel Highlands For Us** — a members' web app for short-term-rental owners around Hidden Valley / Seven Springs. Next.js 16 (App Router) + Supabase (Auth/Postgres/Storage) + Vercel, styled with Tailwind v4 + shadcn. Live at <https://laurelhighlandsforus.vercel.app>.

## Commands

```bash
npm run dev -- -p 3100      # dev server on 3100 (Docker binds :3000 on the maintainer's machine; Playwright also uses 3100)
npm run build               # production build (also the fastest full type-check of routes)
npm run lint                # eslint
npx tsc --noEmit            # type-check only

npm test                    # unit tests (Vitest, tests/unit/**)
npm test -- profile         # run a single unit test file by name fragment
npm run test:e2e            # Playwright E2E (auto-starts dev on :3100 via webServer)
```

- **Unit tests** (`tests/unit/`) cover the pure domain modules (`lib/<feature>.ts`). They need no services.
- **E2E** (`tests/e2e/`): the smoke specs (landing/login/gating) run anywhere. The full-flow specs (magic-link → onboarding → posting) are gated behind `E2E_LOCAL=1` and require the local Supabase stack + Mailpit. Run them with `E2E_LOCAL=1 npm run test:e2e`.

## Supabase / database

- Migrations are plain SQL in `supabase/migrations/` (committed) and define the schema **and RLS policies together**.
- **Local:** `supabase start` (needs Docker) → `supabase status` prints local URL + keys → `supabase db reset` re-applies all migrations. Local email lands in **Mailpit** (`http://127.0.0.1:54324`).
- **Docker is frequently unavailable here.** Migrations are also applied to the hosted DB through the Supabase Management API query endpoint: `POST https://api.supabase.com/v1/projects/<ref>/database/query` with a Supabase PAT (Bearer) and `{ "query": "<sql>" }`. The hosted project is **shared** (it pre-existed); confirm the project ref before applying anything.
- Env: copy `.env.local.example` → `.env.local`. `lib/env.ts` requires `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (it throws at import if missing, so the build needs them set). `SUPABASE_SERVICE_ROLE_KEY` (server-only) is required for classified photo uploads; `GEMINI_API_KEY` (server-only) for the assistant.

## Next.js 16 gotchas (these differ from older Next and from most training data)

- **Request interception lives in `proxy.ts` at the repo root, exporting `proxy` — NOT `middleware.ts`/`middleware`.** `proxy.ts` runs Supabase session refresh + anonymous redirects.
- shadcn here is the **Base UI** variant (`@base-ui/react`), not Radix. The `Button` has **no `asChild`**. To render a link styled as a button, use `buttonVariants({...})` on a real `<Link>`/`<a>`, or Base UI's `render` prop. Plain `<button>` usage with `onClick` is fine.
- `cookies()` and page `searchParams` are **async** — `await` them.

## Architecture

**Route groups.** `app/(public)/` holds unauthenticated pages (landing `/`, `/login`, `/auth/*` handlers, `/credits`). `app/(members)/` holds every gated page and shares `(members)/layout.tsx`, which checks the session and redirects un-onboarded users. **Onboarding is deliberately at top-level `app/onboarding/`, NOT inside `(members)`** — putting it under the members layout would create an infinite redirect loop with the completeness gate.

**Auth flow.** Magic-link only (Google is built but hidden). It uses the SSR **`token_hash` flow**: the Supabase email template links to `/auth/confirm?token_hash=…&type=email`, which calls `verifyOtp`. This requires a custom magic-link email template + correct `site_url`/redirect allow-list, configured in `supabase/config.toml` (local) and the hosted auth config; hosted runs with `mailer_autoconfirm = true`. `proxy.ts` + `lib/auth/public-paths.ts` gate everything; `(members)/layout.tsx` is defense-in-depth.

**Supabase clients.** `lib/supabase/server.ts` (async, cookie-bound — for Server Components / Server Actions / Route Handlers) and `lib/supabase/client.ts` (browser). **Storage uploads use a separate service-role client inside the server action** because the SSR server client's storage sub-client doesn't carry the user JWT (see `app/(members)/classifieds/actions.ts`); the action stays safe by authenticating the user and pinning the path to `${user.id}/…`.

**Authorization is RLS-first.** Every feature table (`profiles`, `resources`, `classifieds`, `classified_images`, `events`) enables RLS. The pattern: members read non-removed rows and write their own; admins override via the SECURITY DEFINER function `public.is_admin()` (used to avoid recursive policy evaluation). Self-promotion to admin is blocked by policy; admin role changes go through a service-role Server Action (`app/(members)/admin/actions.ts`). When adding a feature table, follow this exact policy shape.

**Per-feature structure (consistent across directory / classifieds / events).** A pure domain module `lib/<feature>.ts` (types + validation + helpers, unit-tested) → a list page and a `new/` form page under `app/(members)/<feature>/` → a colocated `actions.ts` (Server Actions for create/update/remove, admin-gated where needed) → card + client-action components in `components/`. Mirror this when extending.

**AI.** `lib/gemini.ts` is server-only (`gemini-2.5-flash` via the Generative Language API). Two auth-gated route handlers: `app/api/assistant` (member chat) and `app/api/recap` (admin recap drafting → saved to `events.recap`). The key never reaches the client.

**Design system.** Warm "autumn lodge" theme in `app/globals.css` — semantic shadcn tokens are remapped to a pine/amber/cream palette, plus named utilities (`text-pine`, `bg-amber`, `text-cream`, `pine-deep`, etc.) and a `font-display` (Fraunces) for headings; body is Hanken Grotesk. Fonts are loaded in `app/layout.tsx`. Regional photos live in `public/scenery/` (Wikimedia Commons, CC — attributed at `/credits`). Keep new UI within these tokens.

## Project workflow

Design specs are in `docs/superpowers/specs/` and per-feature implementation plans in `docs/superpowers/plans/`. **Read the relevant plan before extending a feature** — they document the intended data model, RLS, and UI decisions. Phase 1 (auth, directory, classifieds, events, AI assistant, admin) is complete; Phase 2 (maintenance/asset tracker, document library, billing, social coordination) is specced but unbuilt.
