import { Video, CalendarPlus } from 'lucide-react'
import { buildGoogleCalendarUrl, formatWhen, type EventItem } from '@/lib/events'
import { buttonVariants } from '@/components/ui/button'
import { EventAdminActions } from '@/components/event-admin-actions'
import { EventRecapEditor } from '@/components/event-recap-editor'

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
            <a
              href={event.meet_url}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ size: 'sm' })}
            >
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
      {isAdmin && <EventRecapEditor id={event.id} initialRecap={event.recap} />}
    </div>
  )
}
