import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  STATUSES,
  STATUS_LABELS,
  type Status,
  type Classified,
  type ClassifiedImage,
} from '@/lib/classifieds'
import { buttonVariants } from '@/components/ui/button'
import { ClassifiedCard } from '@/components/classified-card'

export default async function ClassifiedsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const active = STATUSES.includes(status as Status) ? (status as Status) : null

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
    .from('classifieds')
    .select('*')
    .eq('is_removed', false)
    .order('created_at', { ascending: false })
  if (active) query = query.eq('status', active)
  const { data: items } = await query.returns<Classified[]>()

  const ids = (items ?? []).map((i) => i.id)
  const imageMap = new Map<string, string>()
  if (ids.length) {
    const { data: imgs } = await supabase
      .from('classified_images')
      .select('*')
      .in('classified_id', ids)
      .order('sort_order', { ascending: true })
      .returns<ClassifiedImage[]>()
    for (const img of imgs ?? []) {
      if (!imageMap.has(img.classified_id)) {
        const { data } = supabase.storage.from('classified-images').getPublicUrl(img.storage_path)
        imageMap.set(img.classified_id, data.publicUrl)
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-pine-deep">The free pile</h1>
          <p className="mt-2 text-muted-foreground">
            Furniture and supplies passing between owners. One host&rsquo;s spare is another&rsquo;s
            setup.
          </p>
        </div>
        <Link href="/classifieds/new" className={buttonVariants()}>
          <Plus className="size-4" /> Post an item
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/classifieds"
          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
            !active
              ? 'border-pine bg-pine text-primary-foreground'
              : 'border-border text-muted-foreground hover:border-pine/50'
          }`}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/classifieds?status=${s}`}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              active === s
                ? 'border-pine bg-pine text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-pine/50'
            }`}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {items && items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ClassifiedCard
              key={item.id}
              item={item}
              imageUrl={imageMap.get(item.id) ?? null}
              canManage={item.author_id === user!.id}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-12 text-center">
          <p className="font-display text-xl text-pine-deep">Nothing here yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Got a spare bed, sofa, or box of supplies? List it.
          </p>
          <Link href="/classifieds/new" className={buttonVariants({ className: 'mt-5' })}>
            <Plus className="size-4" /> Post an item
          </Link>
        </div>
      )}
    </div>
  )
}
