'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  if (me?.role !== 'admin') redirect('/events')
  return { supabase, user }
}

export async function createEvent(formData: FormData) {
  const { supabase, user } = await requireAdmin()
  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const startsLocal = String(formData.get('starts_at') ?? '').trim()
  const meet_url = String(formData.get('meet_url') ?? '').trim() || null

  if (!title || !startsLocal) redirect('/events/new?error=1')
  const starts_at = new Date(startsLocal).toISOString()

  const { error } = await supabase
    .from('events')
    .insert({ title, description, starts_at, meet_url, created_by: user.id })
  if (error) redirect('/events/new?error=1')

  revalidatePath('/events')
  redirect('/events')
}

export async function deleteEvent(id: string) {
  const { supabase } = await requireAdmin()
  await supabase.from('events').delete().eq('id', id)
  revalidatePath('/events')
}
