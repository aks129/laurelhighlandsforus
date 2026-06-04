'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const supabase = createClient()
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=/home` },
    })
    setStatus(error ? 'error' : 'sent')
  }

  // Google sign-in is deferred until OAuth is configured; magic link only for now.

  return (
    <div className="space-y-6">
      <form onSubmit={sendMagicLink} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <Button type="submit" className="w-full" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Email me a magic link'}
        </Button>
        {status === 'sent' && (
          <p className="text-sm text-green-600">Check your inbox for a sign-in link.</p>
        )}
        {status === 'error' && (
          <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
        )}
      </form>
    </div>
  )
}
