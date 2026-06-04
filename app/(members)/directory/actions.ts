'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validateResource, type Category } from '@/lib/resources'

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? '').trim()
}

export async function createResource(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const input = {
    business_name: str(formData, 'business_name'),
    category: str(formData, 'category') as Category,
    description: str(formData, 'description'),
    contact_name: str(formData, 'contact_name') || null,
    phone: str(formData, 'phone') || null,
    email: str(formData, 'email') || null,
    website: str(formData, 'website') || null,
    area_served: str(formData, 'area_served') || null,
  }
  const check = validateResource(input)
  if (!check.ok) redirect('/directory/new?error=1')

  const { error } = await supabase.from('resources').insert({ ...input, author_id: user.id })
  if (error) redirect('/directory/new?error=1')

  revalidatePath('/directory')
  redirect('/directory')
}

export async function removeResource(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('resources').update({ is_removed: true }).eq('id', id)
  if (!error) revalidatePath('/directory')
}

export async function deleteResource(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('resources').delete().eq('id', id)
  if (!error) revalidatePath('/directory')
}
