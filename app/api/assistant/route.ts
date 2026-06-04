import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateReply, ASSISTANT_SYSTEM, type ChatMessage } from '@/lib/gemini'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let messages: ChatMessage[] = []
  try {
    const body = await request.json()
    if (Array.isArray(body?.messages)) {
      messages = body.messages
        .filter(
          (m: unknown): m is ChatMessage =>
            !!m &&
            (((m as ChatMessage).role === 'user') || ((m as ChatMessage).role === 'model')) &&
            typeof (m as ChatMessage).text === 'string'
        )
        .slice(-12)
    }
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  if (messages.length === 0) {
    return NextResponse.json({ error: 'no messages' }, { status: 400 })
  }

  try {
    const text = await generateReply(ASSISTANT_SYSTEM, messages)
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({
      text: "Sorry — I couldn't reach the assistant just now. Please try again in a moment.",
    })
  }
}
