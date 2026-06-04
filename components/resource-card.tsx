import { Phone, Mail, Globe, MapPin } from 'lucide-react'
import { CATEGORY_LABELS, type Resource } from '@/lib/resources'
import { ResourceActions } from '@/components/resource-actions'

export function ResourceCard({
  resource,
  canManage,
  isAdmin,
}: {
  resource: Resource
  canManage: boolean
  isAdmin: boolean
}) {
  const r = resource
  const website = r.website
    ? r.website.startsWith('http')
      ? r.website
      : `https://${r.website}`
    : null
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-[0_18px_40px_-28px_rgba(80,55,20,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-amber/15 px-3 py-1 text-xs font-medium text-amber">
          {CATEGORY_LABELS[r.category]}
        </span>
        {(canManage || isAdmin) && (
          <ResourceActions id={r.id} canEdit={canManage} canRemove={isAdmin || canManage} />
        )}
      </div>
      <h3 className="mt-3 text-lg font-semibold text-foreground">{r.business_name}</h3>
      {r.description && (
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.description}</p>
      )}
      <dl className="mt-4 space-y-1.5 text-sm text-muted-foreground">
        {r.contact_name && <div>{r.contact_name}</div>}
        {r.phone && (
          <div className="flex items-center gap-2">
            <Phone className="size-4 text-pine" />
            <a href={`tel:${r.phone}`} className="hover:text-pine">{r.phone}</a>
          </div>
        )}
        {r.email && (
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-pine" />
            <a href={`mailto:${r.email}`} className="hover:text-pine">{r.email}</a>
          </div>
        )}
        {website && (
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-pine" />
            <a href={website} target="_blank" rel="noreferrer" className="hover:text-pine">Website</a>
          </div>
        )}
        {r.area_served && (
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-pine" /> {r.area_served}
          </div>
        )}
      </dl>
    </div>
  )
}
