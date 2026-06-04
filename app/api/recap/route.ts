import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateReply, RECAP_SYSTEM } from '@/lib/gemini'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let notes = ''
  try {
    const body = await request.json()
    notes = String(body?.notes ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  if (!notes) return NextResponse.json({ error: 'no notes' }, { status: 400 })

  try {
    const text = await generateReply(RECAP_SYSTEM, [{ role: 'user', text: notes }])
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json(
      { error: "Couldn't draft a recap just now. Please try again." },
      { status: 502 }
    )
  }
}
