'use client'

import { useState, useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { saveRecap } from '@/app/(members)/events/actions'

export function EventRecapEditor({ id, initialRecap }: { id: string; initialRecap: string | null }) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [recap, setRecap] = useState(initialRecap ?? '')
  const [drafting, setDrafting] = useState(false)
  const [saving, startSave] = useTransition()
  const [saved, setSaved] = useState(false)

  async function draft() {
    if (!notes.trim() || drafting) return
    setDrafting(true)
    try {
      const res = await fetch('/api/recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      const data = await res.json()
      if (data.text) setRecap(data.text)
    } finally {
      setDrafting(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 text-sm font-medium text-pine hover:underline"
      >
        {initialRecap ? 'Edit recap' : '+ Add a recap'}
      </button>
    )
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Rough notes from the call</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Bullet points, who said what, decisions…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
        />
        <Button type="button" variant="outline" size="sm" onClick={draft} disabled={drafting || !notes.trim()}>
          <Sparkles className="size-4" /> {drafting ? 'Drafting…' : 'Draft with AI'}
        </Button>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Recap (editable)</label>
        <textarea
          value={recap}
          onChange={(e) => {
            setRecap(e.target.value)
            setSaved(false)
          }}
          rows={6}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={() => startSave(() => void saveRecap(id, recap).then(() => setSaved(true)))}
        >
          {saving ? 'Saving…' : 'Save recap'}
        </Button>
        {saved && <span className="text-xs text-pine">Saved</span>}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>
    </div>
  )
}
