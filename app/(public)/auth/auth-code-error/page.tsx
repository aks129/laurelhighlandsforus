import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Sign-in link problem</h1>
      <p className="text-muted-foreground">
        That sign-in link was invalid or expired. Please request a new one.
      </p>
      <Link href="/login" className="underline">
        Back to sign in
      </Link>
    </main>
  )
}
