import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isProfileComplete, type Profile } from '@/lib/profile'
import { completeOnboarding } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  // Already complete? No need to onboard again.
  if (profile && isProfileComplete(profile)) redirect('/home')

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber">
          Welcome aboard
        </p>
        <h1 className="mt-3 font-display text-4xl text-pine-deep">A little about you</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Just a few details so fellow owners know who&rsquo;s who.
        </p>

        {error && (
          <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            Please enter your name and pick a community.
          </p>
        )}

        <form action={completeOnboarding} className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" required placeholder="Jane Owner" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community">Community</Label>
            <select
              id="community"
              name="community"
              aria-label="Community"
              required
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
              defaultValue=""
            >
              <option value="" disabled>
                Select…
              </option>
              <option value="hidden_valley">Hidden Valley</option>
              <option value="seven_springs">Seven Springs</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" name="phone" type="tel" placeholder="(724) 555-0123" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="num_properties">Number of properties (optional)</Label>
            <Input id="num_properties" name="num_properties" type="number" min={0} placeholder="3" />
          </div>
          <Button type="submit" size="lg" className="w-full">
            Finish &amp; enter
          </Button>
        </form>
      </div>
    </main>
  )
}
