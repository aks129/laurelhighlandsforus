import Image from 'next/image'
import Link from 'next/link'
import {
  Wrench,
  Recycle,
  CalendarDays,
  Sparkles,
  MessagesSquare,
  ArrowRight,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { SiteFooter } from '@/components/site-footer'

const FEATURES = [
  {
    icon: Wrench,
    title: 'Trusted resource directory',
    body: 'Vetted cleaners, handymen, and contractors your neighbors actually rely on — no more cold-calling strangers.',
  },
  {
    icon: Recycle,
    title: 'Members’ marketplace',
    body: 'A “free pile” for furniture and surplus supplies. That spare queen bed becomes someone else’s guest room.',
  },
  {
    icon: CalendarDays,
    title: 'Community calls',
    body: 'Monthly & quarterly video calls to swap tips, coordinate, and tackle shared issues together.',
  },
  {
    icon: Sparkles,
    title: 'AI hosting helper',
    body: 'Ask about pricing, local rules, and Airbnb/VRBO best practices — answers tuned to the Laurel Highlands.',
  },
  {
    icon: MessagesSquare,
    title: 'Members Slack',
    body: 'Day-to-day conversation, quick questions, and wins shared with owners who get it.',
  },
]

export default function LandingPage() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative isolate grain min-h-[92vh] overflow-hidden">
        <Image
          src="/scenery/hero-autumn.jpg"
          alt="Autumn foliage across the Laurel Mountains of Pennsylvania"
          fill
          priority
          sizes="100vw"
          className="animate-slow-zoom -z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-pine-deep/55 via-pine-deep/25 to-pine-deep/80" />

        <div className="mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-center px-6 py-24">
          <p className="animate-fade-up text-sm font-medium uppercase tracking-[0.22em] text-amber-soft">
            Hidden Valley &middot; Seven Springs &middot; Laurel Highlands
          </p>
          <h1
            className="animate-fade-up mt-5 max-w-3xl font-display text-5xl leading-[1.04] text-cream text-balance [animation-delay:80ms] sm:text-6xl md:text-7xl"
          >
            Hosting the Laurel Highlands, together.
          </h1>
          <p
            className="animate-fade-up mt-6 max-w-xl text-lg leading-relaxed text-cream/90 text-pretty [animation-delay:160ms]"
          >
            A members&rsquo; community for rental owners and Airbnb operators in the mountains we
            love. Pool resources, share what works, and stop going it alone.
          </p>
          <div
            className="animate-fade-up mt-9 flex flex-wrap items-center gap-4 [animation-delay:240ms]"
          >
            <Link href="/login" className={buttonVariants({ size: 'lg' })}>
              Join the community
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="#inside"
              className="text-sm font-medium text-cream/90 underline-offset-4 hover:underline"
            >
              See what&rsquo;s inside
            </Link>
          </div>
          <p
            className="animate-fade-up mt-6 text-sm text-cream/70 [animation-delay:300ms]"
          >
            Free for 90 days &middot; built by a fellow owner
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="font-display text-2xl leading-relaxed text-pine-deep text-balance sm:text-3xl">
          We own and host across these mountains&mdash;and we&rsquo;ve all felt how siloed it can
          be. This is the front porch we wished we had: neighbors helping neighbors run better
          rentals.
        </p>
      </section>

      {/* Features */}
      <section id="inside" className="border-y border-border bg-cream/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber">
              What&rsquo;s inside
            </p>
            <h2 className="mt-3 font-display text-4xl text-pine-deep sm:text-5xl">
              Everything an owner wishes they had nearby
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-amber/60 hover:shadow-[0_18px_40px_-24px_rgba(80,55,20,0.5)]"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-amber/15 text-amber transition-colors group-hover:bg-amber/25">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
            <div className="flex flex-col justify-center rounded-2xl border border-dashed border-amber/50 bg-amber/5 p-6">
              <p className="font-display text-xl text-pine-deep">More on the way</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Legal & county docs, maintenance tracking, and shared marketing &mdash; rolling out
                as the community grows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Scenery quote band */}
      <section className="relative isolate grain overflow-hidden">
        <Image
          src="/scenery/summit-view.jpg"
          alt="View from a Laurel Mountain summit"
          fill
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-pine-deep/70" />
        <div className="mx-auto max-w-3xl px-6 py-28 text-center">
          <p className="font-display text-3xl leading-snug text-cream text-balance sm:text-4xl">
            &ldquo;Less siloed. More neighborly. A little more organized than we are today.&rdquo;
          </p>
          <Link
            href="/login"
            className={buttonVariants({ size: 'lg', className: 'mt-10' })}
          >
            Become a member
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
