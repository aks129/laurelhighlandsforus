'use client'

import { useTransition } from 'react'
import { STATUSES, STATUS_LABELS, type Status } from '@/lib/classifieds'
import { setStatus, deleteClassified, removeClassified } from '@/app/(members)/classifieds/actions'

export function ClassifiedActions({
  id,
  status,
  canManage,
  isAdmin,
}: {
  id: string
  status: Status
  canManage: boolean
  isAdmin: boolean
}) {
  const [pending, start] = useTransition()

  if (canManage) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <select
          aria-label="Status"
          defaultValue={status}
          disabled={pending}
          onChange={(e) => start(() => void setStatus(id, e.target.value as Status))}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending}
          className="text-xs text-muted-foreground hover:text-destructive"
          onClick={() => {
            if (confirm('Delete this listing?')) start(() => void deleteClassified(id))
          }}
        >
          Delete
        </button>
      </div>
    )
  }

  if (isAdmin) {
    return (
      <button
        type="button"
        disabled={pending}
        className="text-xs text-muted-foreground hover:text-destructive"
        onClick={() => {
          if (confirm('Remove this listing?')) start(() => void removeClassified(id))
        }}
      >
        Remove listing
      </button>
    )
  }
  return null
}
