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
  const endIso =
    event.ends_at ?? new Date(new Date(event.starts_at).getTime() + 3_600_000).toISOString()
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
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}
