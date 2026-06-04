import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'

const LINKS = [
  { href: '/home', label: 'Home' },
  { href: '/community', label: 'Community' },
  { href: '/account', label: 'Account' },
]

export function SiteNav({ isAdmin }: { isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link
          href="/home"
          className="flex items-center gap-2 font-display text-lg text-pine-deep"
        >
          <span className="size-2.5 rounded-full bg-amber" aria-hidden />
          Laurel Highlands For Us
        </Link>
        <div className="flex items-center gap-5 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-muted-foreground transition-colors hover:text-pine"
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-full bg-amber/15 px-3 py-1 text-amber transition-colors hover:bg-amber/25"
            >
              Admin
            </Link>
          )}
          <SignOutButton />
        </div>
      </nav>
    </header>
  )
}
