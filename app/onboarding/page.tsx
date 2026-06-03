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
    <div className="mx-auto max-w-md space-y-6 px-6 py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Welcome — tell us about you</h1>
        <p className="text-sm text-muted-foreground">Just a few details to set up your profile.</p>
      </div>
      {error && <p className="text-sm text-red-600">Please enter your name and pick a community.</p>}
      <form action={completeOnboarding} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="community">Community</Label>
          <select
            id="community"
            name="community"
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
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
        <div className="space-y-1">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" name="phone" type="tel" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="num_properties">Number of properties (optional)</Label>
          <Input id="num_properties" name="num_properties" type="number" min={0} />
        </div>
        <Button type="submit" className="w-full">
          Finish
        </Button>
      </form>
    </div>
  )
}
