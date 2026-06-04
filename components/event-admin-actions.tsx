'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteEvent } from '@/app/(members)/events/actions'

export function EventAdminActions({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label="Delete event"
      onClick={() => {
        if (confirm('Delete this call?')) start(() => void deleteEvent(id))
      }}
    >
      <Trash2 className="size-4 text-muted-foreground" />
    </Button>
  )
}
