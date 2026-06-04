import Image from 'next/image'
import Link from 'next/link'
import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Scenery panel */}
      <div className="relative isolate hidden grain overflow-hidden lg:block">
        <Image
          src="/scenery/cucumber-falls.jpg"
          alt="Cucumber Falls in Ohiopyle State Park, Laurel Highlands"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-pine-deep/85 via-pine-deep/35 to-pine-deep/40" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" className="font-display text-xl text-cream">
            Laurel Highlands For Us
          </Link>
          <p className="max-w-sm font-display text-3xl leading-snug text-cream text-balance">
            Welcome back to the porch.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="font-display text-lg text-pine-deep lg:hidden">
            Laurel Highlands For Us
          </Link>
          <h1 className="mt-6 font-display text-3xl text-pine-deep">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we&rsquo;ll send you a secure sign-in link &mdash; no password to
            remember.
          </p>
          <div className="mt-8">
            <LoginForm />
          </div>
          <p className="mt-8 text-xs text-muted-foreground">
            New here? Signing in creates your member account. Free for your first 90 days.
          </p>
        </div>
      </div>
    </main>
  )
}
