'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { setRole } from '@/app/(members)/admin/actions'

export function RoleToggle({
  userId,
  role,
  isSelf,
}: {
  userId: string
  role: 'member' | 'admin'
  isSelf: boolean
}) {
  const [pending, start] = useTransition()
  if (isSelf) return <span className="text-xs text-muted-foreground">You</span>
  const next = role === 'admin' ? 'member' : 'admin'
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => start(() => void setRole(userId, next))}
    >
      {role === 'admin' ? 'Make member' : 'Make admin'}
    </Button>
  )
}
