import { describe, it, expect } from 'vitest'
import { buildGoogleCalendarUrl, splitUpcomingPast, type EventItem } from '@/lib/events'

const ev: EventItem = {
  id: '1',
  title: 'Monthly Owners Call',
  description: 'Catch up + Q&A',
  starts_at: '2026-08-15T18:00:00.000Z',
  ends_at: '2026-08-15T19:00:00.000Z',
  meet_url: 'https://meet.google.com/abc-defg-hij',
  recap: null,
  created_by: null,
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
