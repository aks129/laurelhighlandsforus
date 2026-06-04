import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createEvent } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single<{ role: string }>()
  if (me?.role !== 'admin') redirect('/events')

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/events" className="text-sm text-pine hover:underline">
        &larr; Back to calls
      </Link>
      <h1 className="mt-4 font-display text-3xl text-pine-deep">Schedule a call</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create a Meet link (meet.google.com/new) and paste it below — members get Join &amp;
        Add-to-Calendar buttons.
      </p>
      {error && (
        <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Please add a title and a date/time.
        </p>
      )}
      <form
        action={createEvent}
        className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6"
      >
        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" name="title" required placeholder="Monthly Owners Call" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="starts_at">Date &amp; time *</Label>
          <Input id="starts_at" name="starts_at" type="datetime-local" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meet_url">Meet link</Label>
          <Input id="meet_url" name="meet_url" placeholder="https://meet.google.com/abc-defg-hij" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Agenda / notes</Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
          />
        </div>
        <Button type="submit" size="lg" className="w-full">
          Schedule call
        </Button>
      </form>
    </div>
  )
}
