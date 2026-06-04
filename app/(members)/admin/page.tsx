import { redirect } from 'next/navigation'
import { Users, Wrench, Recycle, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { COMMUNITY_LABELS, type Profile } from '@/lib/profile'
import { RoleToggle } from '@/components/role-toggle'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single<{ role: string }>()
  if (me?.role !== 'admin') redirect('/home')

  const nowIso = new Date().toISOString()
  const [members, resourceCount, classifiedCount, upcomingCount] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: true }).returns<Profile[]>(),
    supabase.from('resources').select('*', { count: 'exact', head: true }).eq('is_removed', false),
    supabase.from('classifieds').select('*', { count: 'exact', head: true }).eq('is_removed', false),
    supabase.from('events').select('*', { count: 'exact', head: true }).gte('starts_at', nowIso),
  ])

  const profiles = members.data ?? []
  const stats = [
    { icon: Users, label: 'Members', value: profiles.length },
    { icon: Wrench, label: 'Resources', value: resourceCount.count ?? 0 },
    { icon: Recycle, label: 'Free-pile items', value: classifiedCount.count ?? 0 },
    { icon: CalendarDays, label: 'Upcoming calls', value: upcomingCount.count ?? 0 },
  ]

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-4xl text-pine-deep">Admin</h1>
        <p className="mt-2 text-muted-foreground">Community at a glance, and member management.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-pine/10 text-pine">
              <s.icon className="size-5" />
            </span>
            <p className="mt-3 font-display text-3xl text-pine-deep">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-pine-deep">Members</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Community</th>
                <th className="px-4 py-3 font-medium">Properties</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{p.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.community ? COMMUNITY_LABELS[p.community] : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.num_properties ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.role === 'admin'
                          ? 'rounded-full bg-amber/15 px-2.5 py-0.5 text-xs font-medium text-amber'
                          : 'rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground'
                      }
                    >
                      {p.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RoleToggle userId={p.id} role={p.role} isSelf={p.id === user!.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
