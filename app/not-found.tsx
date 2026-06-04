import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="font-display text-6xl text-amber">404</p>
      <h1 className="font-display text-3xl text-pine-deep">This trail doesn&rsquo;t go anywhere</h1>
      <p className="text-muted-foreground">
        The page you&rsquo;re looking for isn&rsquo;t here. Let&rsquo;s get you back to the lodge.
      </p>
      <Link href="/" className={buttonVariants()}>
        Back home
      </Link>
    </main>
  )
}
