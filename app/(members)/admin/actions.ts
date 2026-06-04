'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

export async function setRole(userId: string, role: 'member' | 'admin') {
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
  if (me?.role !== 'admin') redirect('/home')

  // Don't let an admin demote themselves (avoids locking out the last admin).
  if (userId === user.id && role !== 'admin') return

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return
  const svc = createSupabaseClient(env.supabaseUrl, serviceKey, { auth: { persistSession: false } })
  await svc.from('profiles').update({ role }).eq('id', userId)
  revalidatePath('/admin')
}
