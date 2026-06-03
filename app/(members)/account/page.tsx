import { createClient } from '@/lib/supabase/server'
import { COMMUNITY_LABELS, type Profile } from '@/lib/profile'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single<Profile>()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Your account</h1>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Name</dt>
          <dd>{profile?.full_name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd>{profile?.email ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Community</dt>
          <dd>{profile?.community ? COMMUNITY_LABELS[profile.community] : '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Properties</dt>
          <dd>{profile?.num_properties ?? '—'}</dd>
        </div>
      </dl>
    </div>
  )
}
