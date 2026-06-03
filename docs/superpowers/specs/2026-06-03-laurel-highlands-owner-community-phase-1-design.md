# Laurel Highlands Owner Community — Phase 1 Design

**Date:** 2026-06-03
**Status:** Approved for planning
**Working name:** "Laurel Highlands For Us" (placeholder, easy to change)

## Context & vision

Eugene owns three rental properties in the Laurel Highlands (PA) and hosts others. He and other
owners / Airbnb operators around Hidden Valley Resort and Seven Springs want a central place to stop
being so siloed: connect owners, pool resources, share vetted service providers, pass along surplus
items, coordinate with the Go Laurel Highlands association, centralize legal/county/state documents,
share hosting/pricing tips, run community calls, and eventually track per-property maintenance — with
an integrated AI assistant on top.

The full vision is a multi-subsystem platform. It is **decomposed into building blocks** so each can
be built and validated independently:

1. Member community & comms (chat + calls)
2. Resource directory (cleaners, handyman, contractors, services)
3. Classifieds / "free pile" (surplus furniture & supplies between owners)
4. Knowledge & document library (legal docs, county/state regs, hosting rules & tips, pricing)
5. Maintenance & asset tracker (per-property: HVAC, roofing, windows, hot tubs, supplies, HOA common areas)
6. Social media / advertising coordination
7. Membership & billing (free 90 days → $5/mo → $20/mo)
8. AI assistant layer
9. Go Laurel Highlands liaison

**Business model (context, not built in Phase 1):** modest monthly fee — free for 90 days, start at
$5/mo, transition to ~$20/mo for paying members — plus monthly/quarterly calls and community
engagement.

## Phase 1 goal

The smallest thing Eugene can share with his Hidden Valley contacts in the next month or two that gets
real owners in the door and proves they will show up (and, later, pay). Phase 1 delivers a community
launch pad, not the full platform.

## Phase 1 scope

A **website** providing:

- A public **landing page** (the vision + a Join call-to-action that captures email by creating an account).
- Member **login** (magic link + Google).
- A self-serve **resource directory** (cleaners, handyman, contractors, hot tub, etc.).
- Self-serve **classifieds / "free pile"** with photos and an Available/Claimed/Gone status.
- An **events page** for monthly/quarterly community calls (Meet link + Add-to-Google-Calendar), link-based.
- A **Gemini-powered AI assistant** (free tier): hosting & area Q&A, a welcome/onboarding helper, and admin meeting-recap drafts.
- A **Community page** linking out to **Slack** (the chat tool for Phase 1).
- An **admin area** (Eugene) to view members, remove any listing, schedule events, and draft recaps.

### Decisions locked during brainstorming

| Decision | Choice |
|---|---|
| Phase 1 outcomes | Community + shared resources/classifieds + a real website (billing deferred) |
| Directory/classifieds home | On the website we build |
| Member accounts | **Logins required** |
| Login method | **Magic link + Google** |
| Community/chat tool | **Slack (free tier)**, linked from the site |
| Listing moderation | **Auto-publish; admin can remove** |
| Tech stack | **Next.js + Supabase + Vercel** |
| Calendar/Meet depth | **Link-based (no Google Calendar API)** |
| AI assistant (Gemini) jobs | Hosting & area Q&A · Welcome/onboarding helper · Meeting-recap drafts (no listing-writing helper) |

## Out of scope (deferred to later phases)

Billing / paywall, maintenance & asset tracker, full Google Calendar API integration, document/knowledge
library, social-media coordination, Go Laurel Highlands liaison, listing-writing AI helper. The data
model and structure below anticipate these so they add cleanly later without a rebuild.

## Architecture & stack

- **Frontend/server:** Next.js (App Router), Tailwind CSS, shadcn/ui.
- **Backend services:** Supabase — Auth (magic link + Google OAuth), Postgres (data), Storage (classified images).
- **Hosting:** Vercel.
- **AI:** Google Gemini free-tier Flash model via the Generative Language API, called server-side only.
- **Security:** Supabase Row-Level Security (RLS) enforces visibility/ownership at the database layer.

No custom chat server (Slack), no billing, no Google Calendar API in Phase 1.

## Site map & access

**Public (no login):**
- `/` — Landing: vision, "what you get," **Join** CTA (entering email to join = email capture + account creation in one step).
- Login / auth-callback pages.

**Members only (login required):**
- `/directory` — browse/filter resources; "Add a resource".
- `/classifieds` — browse items; "Post an item"; set status Available/Claimed/Gone; photos.
- `/events` — upcoming & past community calls; Join call + Add to Google Calendar; recaps.
- `/assistant` — Gemini hosting & area Q&A chat.
- `/community` — what the Slack is + button to join it.
- `/account` — edit profile.

**Admin only (Eugene):**
- `/admin` — view members; remove any listing; schedule events; draft/save meeting recaps.

Listing **contact details are visible only to logged-in members** (a privacy win from gating).

## Data model (Supabase Postgres)

- **profiles** — `id` (= auth user id), `full_name`, `email`, `phone?`, `community` (Hidden Valley | Seven Springs | Other), `num_properties?`, `role` (member | admin), `created_at`.
  - *Reserved for later:* `stripe_customer_id`, `subscription_status` (billing phase).
- **resources** — `id`, `author_id` (→ profiles), `category` (cleaner | handyman | contractor | landscaping | hot_tub | other), `business_name`, `contact_name?`, `phone?`, `email?`, `website?`, `area_served?`, `description`, `is_removed` (bool), `created_at`, `updated_at`.
- **classifieds** — `id`, `author_id`, `title`, `description`, `price` (numeric, null = Free), `status` (available | claimed | gone), `is_removed` (bool), `created_at`, `updated_at`.
- **classified_images** — `id`, `classified_id` (→ classifieds), `storage_path`, `sort_order`. (Files in Supabase Storage.)
- **events** — `id`, `title`, `description`, `starts_at`, `meet_url`, `recap?` (text), `created_by` (→ profiles), `created_at`.

### Access rules (RLS, summarized)

- A member can read all non-removed `resources` / `classifieds` / `events`.
- A member can insert listings as themselves and update/delete only their own.
- Admin can update/remove (soft-delete via `is_removed`) any listing and is the only role that can write `events`.
- `profiles`: a member reads/updates their own row; admin reads all.

## Auth & roles

- Supabase Auth: **magic link + Google OAuth**.
- On first login, a `profiles` row is created and the member completes a short **onboarding**: name, community (Hidden Valley / Seven Springs / Other), optional phone and number of properties.
- Roles: **member** (post/browse, edit own listings) and **admin** (Eugene — remove any listing, manage events, view members).

## Key flows

1. **Join** → enter email (magic link) or sign in with Google → first-time onboarding → members home.
2. **Post a resource / classified** → fill form (classifieds may attach photos) → **auto-publishes** → appears in list.
3. **Manage own listing** → edit fields; set a classified to Claimed/Gone.
4. **Admin remove** → soft-delete (`is_removed = true`; hidden, not destroyed) from `/admin` or inline.
5. **Community call** → admin schedules an event with a pasted Meet link → members see it on `/events`, click **Join call**, and **Add to Google Calendar** (standard calendar template URL; no API/login). After the call, admin drafts a recap (see below) shown on the event.
6. **Join Slack** → `/community` page with the invite link.

## Events / community calls (link-based)

Admin creates an event (title, date/time, description, pasted Meet link). The page renders:
- **Join call** → opens the Meet link.
- **Add to Google Calendar** → built from a standard Google Calendar template URL (`https://calendar.google.com/calendar/render?action=TEMPLATE&...`) using the event's title, time, description, and Meet link. No Google API, no login, works for any email provider.

Designed so a full Google Calendar API integration (auto-create events, auto-Meet links, emailed
invites) can replace the link-based approach in a later phase without changing the data model.

## Gemini AI assistant (free tier)

Server-side `/api/assistant` route calling the Gemini free-tier Flash model via `GEMINI_API_KEY`. The
key never reaches the browser. Light rate-limiting (per-user/day) to stay within free quotas. Three uses:

1. **Hosting & area Q&A** — `/assistant` chat page; system-prompted as a Laurel Highlands short-term-rental helper. Seed of the future grounded knowledge assistant.
2. **Welcome / onboarding helper** — on first login the same assistant greets the new member and points them to directory, classifieds, events, and Slack.
3. **Meeting recap drafts (admin)** — admin pastes raw call notes → Gemini drafts a clean recap → admin edits & saves → recap appears on that event for members who missed the call.

(No listing-writing helper in Phase 1, per decision.)

## Environment / setup

- **Supabase:** project URL + anon key (client) and service-role key (server only).
- **Google OAuth:** client ID/secret for "Sign in with Google" (configured in Supabase Auth).
- **`GEMINI_API_KEY`:** Google AI Studio free tier (separate from Google OAuth; both free).
- **Slack:** an invite link stored in config/env for the Community page.
- Hosting env vars set in Vercel.

## Testing

TDD throughout:

- **Unit:** form validation (resource/classified/event fields, image constraints), Google Calendar URL builder, assistant rate-limit logic.
- **Integration:** posting and soft-removing listings; RLS access rules (member vs admin vs anonymous); profile creation/onboarding; events writable by admin only; assistant route auth + rate limit.
- **End-to-end (Playwright):** the core flows — join/login, post a listing, admin remove, schedule an event and add-to-calendar, ask the assistant a question.

## Future-proofing notes

- `profiles.role` + reserved billing columns → Stripe paywall ($5/$20) adds without schema churn.
- Lightweight `community` / `num_properties` on profiles → seed for the Phase 2 maintenance/asset tracker (full per-property records come later).
- Clean Postgres data + server API routes → grounded RAG assistant and a document/knowledge library slot in later.
- Link-based events → upgradeable to full Calendar/Meet API later without data-model changes.
