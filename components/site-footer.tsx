import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-cream/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 sm:col-span-2 lg:col-span-2">
          <p className="font-display text-xl text-pine-deep">Laurel Highlands For Us</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            A members&rsquo; community for rental owners and Airbnb operators around Hidden Valley,
            Seven Springs, and the wider Laurel Highlands.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">Community</p>
          <Link href="/login" className="block text-muted-foreground hover:text-pine">
            Join / Sign in
          </Link>
          <Link href="/community" className="block text-muted-foreground hover:text-pine">
            Slack
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">About</p>
          <Link href="/credits" className="block text-muted-foreground hover:text-pine">
            Photo credits
          </Link>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Laurel Highlands For Us. Made by owners, for owners.</p>
          <p>
            Regional photography from{' '}
            <Link href="/credits" className="underline underline-offset-2 hover:text-pine">
              Wikimedia Commons contributors
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  )
}
