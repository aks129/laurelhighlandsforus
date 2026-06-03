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
        <Button size="lg" render={<Link href="/login" />}>
          Join the community
        </Button>
      </div>
    </main>
  )
}
