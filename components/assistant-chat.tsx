'use client'

import { useRef, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ChatMessage } from '@/lib/gemini'

const WELCOME: ChatMessage = {
  role: 'model',
  text: "Hi! I'm your Laurel Highlands hosting helper. Ask me about pricing, local services, seasonal tips, or Airbnb/VRBO best practices.",
}

const SUGGESTIONS = [
  'How should I price for fall foliage weekends?',
  'What should a Hidden Valley listing mention?',
  'Tips for winter ski-season turnovers?',
]

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    const next = [...messages, { role: 'user' as const, text: trimmed }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // drop the seeded welcome message from what we send to the model
        body: JSON.stringify({ messages: next.filter((m) => m !== WELCOME) }),
      })
      const data = await res.json()
      setMessages((m) => [...m, { role: 'model', text: data.text ?? '…' }])
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'model', text: 'Sorry — something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }))
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-border bg-card">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex gap-3'}>
            {m.role === 'model' && (
              <span className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-amber/15 text-amber">
                <Sparkles className="size-4" />
              </span>
            )}
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[80%] rounded-2xl rounded-br-sm bg-pine px-4 py-2.5 text-sm text-primary-foreground'
                  : 'max-w-[80%] whitespace-pre-line rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm text-foreground'
              }
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && <p className="pl-10 text-sm text-muted-foreground">Thinking…</p>}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pl-10 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-pine/50 hover:text-pine"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex gap-2 border-t border-border p-4"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about hosting, pricing, local tips…"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}
