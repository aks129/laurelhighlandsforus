import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SiteNav } from '@/components/site-nav'
import { isProfileComplete, type Profile } from '@/lib/profile'

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
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

  // First-time members must complete onboarding before using the app.
  if (profile && !isProfileComplete(profile)) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen">
      <SiteNav isAdmin={profile?.role === 'admin'} />
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  )
}
