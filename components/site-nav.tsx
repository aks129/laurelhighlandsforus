import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'

const LINKS = [
  { href: '/home', label: 'Home' },
  { href: '/community', label: 'Community' },
  { href: '/account', label: 'Account' },
]

export function SiteNav({ isAdmin }: { isAdmin: boolean }) {
  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/home" className="font-semibold">
          Laurel Highlands For Us
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" className="text-muted-foreground hover:text-foreground">
              Admin
            </Link>
          )}
          <SignOutButton />
        </div>
      </nav>
    </header>
  )
}
