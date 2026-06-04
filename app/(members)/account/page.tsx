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

  const rows = [
    { label: 'Name', value: profile?.full_name ?? '—' },
    { label: 'Email', value: profile?.email ?? '—' },
    { label: 'Community', value: profile?.community ? COMMUNITY_LABELS[profile.community] : '—' },
    { label: 'Properties', value: profile?.num_properties ?? '—' },
  ]

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl text-pine-deep">Your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">Your member profile details.</p>
      <dl className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 px-5 py-4">
            <dt className="text-sm text-muted-foreground">{r.label}</dt>
            <dd className="text-sm font-medium text-foreground">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
