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
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single<{ role: string }>()
  const isAdmin = me?.role === 'admin'

  const { data: events } = await supabase.from('events').select('*').returns<EventItem[]>()
  const { upcoming, past } = splitUpcomingPast(events ?? [])

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-pine-deep">Community calls</h1>
          <p className="mt-2 text-muted-foreground">
            Monthly &amp; quarterly calls for owners. Everyone&rsquo;s welcome.
          </p>
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
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} isPast={false} isAdmin={isAdmin} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center">
            <p className="font-display text-lg text-pine-deep">No calls on the calendar yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {isAdmin
                ? 'Schedule the first community call.'
                : 'Check back soon — the next call will appear here.'}
            </p>
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl text-pine-deep">Past calls</h2>
          <div className="space-y-4">
            {past.map((e) => (
              <EventCard key={e.id} event={e} isPast isAdmin={isAdmin} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
