import Image from 'next/image'
import Link from 'next/link'
import { MessagesSquare, User, Wrench, Recycle, CalendarDays, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/profile'

const QUICK_LINKS = [
  { href: '/directory', icon: Wrench, title: 'Resource directory', body: 'Find trusted cleaners, handymen & contractors.', live: true },
  { href: '/classifieds', icon: Recycle, title: 'The free pile', body: 'Claim or pass along furniture & supplies.', live: true },
  { href: '/community', icon: MessagesSquare, title: 'Community Slack', body: 'Jump into the day-to-day conversation.', live: true },
  { href: '/account', icon: User, title: 'Your account', body: 'Review and update your profile.', live: true },
]

const COMING = [
  { icon: CalendarDays, title: 'Community calls' },
  { icon: Sparkles, title: 'AI hosting helper' },
]

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single<Profile>()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'neighbor'

  return (
    <div className="space-y-10">
      {/* Welcome banner */}
      <section className="relative isolate grain overflow-hidden rounded-3xl border border-border">
        <Image
          src="/scenery/autumn-ridge.jpg"
          alt="Autumn ridge in the Laurel Highlands"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 900px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-pine-deep/85 via-pine-deep/55 to-pine-deep/25" />
        <div className="relative px-8 py-14 sm:px-12 sm:py-16">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber-soft">
            Welcome back
          </p>
          <h1 className="mt-3 font-display text-4xl text-cream sm:text-5xl">
            Hello, {firstName}.
          </h1>
          <p className="mt-3 max-w-md text-cream/90">
            Glad you&rsquo;re here. The community is just getting started &mdash; here&rsquo;s where
            to begin.
          </p>
        </div>
      </section>

      {/* Quick links */}
      <section className="grid gap-5 sm:grid-cols-2">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-amber/60 hover:shadow-[0_18px_40px_-24px_rgba(80,55,20,0.5)]"
          >
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-pine/10 text-pine transition-colors group-hover:bg-pine/15">
              <l.icon className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{l.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{l.body}</p>
          </Link>
        ))}
      </section>

      {/* Coming soon */}
      <section>
        <h2 className="font-display text-2xl text-pine-deep">Coming soon</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The features we&rsquo;re building next for the community.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COMING.map((c) => (
            <div
              key={c.title}
              className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-4"
            >
              <c.icon className="size-5 text-amber" />
              <span className="text-sm font-medium text-foreground">{c.title}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
