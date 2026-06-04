'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { validateClassified, STATUSES, type Status } from '@/lib/classifieds'

const MAX_PHOTOS = 4
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export async function createClassified(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const priceRaw = String(formData.get('price') ?? '').trim()
  const isFree = formData.get('free') === 'on'
  const price = isFree || priceRaw === '' ? null : Number(priceRaw)

  const check = validateClassified({ title, description, price })
  if (!check.ok) redirect('/classifieds/new?error=1')

  const { data: created, error } = await supabase
    .from('classifieds')
    .insert({ title, description, price, author_id: user.id })
    .select('id')
    .single<{ id: string }>()
  if (error || !created) redirect('/classifieds/new?error=1')

  // Supabase's storage client on the SSR server client doesn't carry the user
  // bearer, so build a client bound to the user's access token for uploads
  // (keeps the per-user-folder storage RLS enforced).
  // Photos upload via a service-role client: the SSR server client's storage
  // sub-client doesn't carry the user JWT (failing storage RLS). This action is
  // authenticated and pins every path to the user's own folder, so uploads stay
  // scoped to the uploader.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const storage = serviceKey
    ? createSupabaseClient(env.supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      }).storage
    : supabase.storage

  const files = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0)
  let order = 0
  for (const file of files.slice(0, MAX_PHOTOS)) {
    if (!ALLOWED.includes(file.type) || file.size > 5_242_880) continue
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${user.id}/${created.id}-${order}.${ext}`
    const bytes = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await storage
      .from('classified-images')
      .upload(path, bytes, { contentType: file.type, upsert: true })
    if (!upErr) {
      await supabase.from('classified_images').insert({
        classified_id: created.id,
        storage_path: path,
        sort_order: order,
      })
      order++
    }
  }

  revalidatePath('/classifieds')
  redirect('/classifieds')
}

export async function setStatus(id: string, status: Status) {
  if (!STATUSES.includes(status)) return
  const supabase = await createClient()
  await supabase.from('classifieds').update({ status }).eq('id', id)
  revalidatePath('/classifieds')
}

export async function removeClassified(id: string) {
  const supabase = await createClient()
  await supabase.from('classifieds').update({ is_removed: true }).eq('id', id)
  revalidatePath('/classifieds')
}

export async function deleteClassified(id: string) {
  const supabase = await createClient()
  await supabase.from('classifieds').delete().eq('id', id)
  revalidatePath('/classifieds')
}
