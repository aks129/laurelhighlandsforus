import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES, CATEGORY_LABELS, type Category, type Resource } from '@/lib/resources'
import { buttonVariants } from '@/components/ui/button'
import { ResourceCard } from '@/components/resource-card'

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const active = CATEGORIES.includes(category as Category) ? (category as Category) : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single<{ role: string }>()
  const isAdmin = me?.role === 'admin'

  let query = supabase
    .from('resources')
    .select('*')
    .eq('is_removed', false)
    .order('created_at', { ascending: false })
  if (active) query = query.eq('category', active)
  const { data: resources } = await query.returns<Resource[]>()

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-pine-deep">Resource directory</h1>
          <p className="mt-2 text-muted-foreground">
            Trusted local services, shared by fellow owners.
          </p>
        </div>
        <Link href="/directory/new" className={buttonVariants()}>
          <Plus className="size-4" /> Add a resource
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/directory"
          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
            !active
              ? 'border-pine bg-pine text-primary-foreground'
              : 'border-border text-muted-foreground hover:border-pine/50'
          }`}
        >
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/directory?category=${c}`}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              active === c
                ? 'border-pine bg-pine text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-pine/50'
            }`}
          >
            {CATEGORY_LABELS[c]}
          </Link>
        ))}
      </div>

      {resources && resources.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              canManage={r.author_id === user!.id}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-12 text-center">
          <p className="font-display text-xl text-pine-deep">No listings yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Be the first to share a trusted provider with the community.
          </p>
          <Link href="/directory/new" className={buttonVariants({ className: 'mt-5' })}>
            <Plus className="size-4" /> Add a resource
          </Link>
        </div>
      )}
    </div>
  )
}
