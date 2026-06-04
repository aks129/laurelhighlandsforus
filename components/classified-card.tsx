import { formatPrice, STATUS_LABELS, type Classified } from '@/lib/classifieds'
import { ClassifiedActions } from '@/components/classified-actions'

const STATUS_STYLE: Record<string, string> = {
  available: 'bg-pine/12 text-pine',
  claimed: 'bg-amber/20 text-amber',
  gone: 'bg-muted text-muted-foreground',
}

export function ClassifiedCard({
  item,
  imageUrl,
  canManage,
  isAdmin,
}: {
  item: Classified
  imageUrl: string | null
  canManage: boolean
  isAdmin: boolean
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-[4/3] bg-muted">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={item.title} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center font-display text-2xl text-muted-foreground/50">
            No photo
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[item.status]}`}
        >
          {STATUS_LABELS[item.status]}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
          <span className="shrink-0 font-display text-lg text-pine-deep">{formatPrice(item.price)}</span>
        </div>
        {item.description && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        )}
        {(canManage || isAdmin) && (
          <div className="mt-4 border-t border-border pt-3">
            <ClassifiedActions id={item.id} status={item.status} canManage={canManage} isAdmin={isAdmin} />
          </div>
        )}
      </div>
    </div>
  )
}
