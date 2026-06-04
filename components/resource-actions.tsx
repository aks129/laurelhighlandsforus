'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { removeResource, deleteResource } from '@/app/(members)/directory/actions'

export function ResourceActions({
  id,
  canEdit,
  canRemove,
}: {
  id: string
  canEdit: boolean
  canRemove: boolean
}) {
  const [pending, start] = useTransition()
  if (!canRemove) return null
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label="Remove listing"
      onClick={() => {
        if (confirm('Remove this listing?')) {
          // owners hard-delete their own; admins soft-remove others
          start(() => {
            void (canEdit ? deleteResource(id) : removeResource(id))
          })
        }
      }}
    >
      <Trash2 className="size-4 text-muted-foreground" />
    </Button>
  )
}
