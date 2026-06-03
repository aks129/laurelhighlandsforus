'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Community } from '@/lib/profile'

const COMMUNITIES: Community[] = ['hidden_valley', 'seven_springs', 'other']

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const full_name = String(formData.get('full_name') ?? '').trim()
  const communityRaw = String(formData.get('community') ?? '')
  const phone = String(formData.get('phone') ?? '').trim() || null
  const numRaw = String(formData.get('num_properties') ?? '').trim()

  if (!full_name || !COMMUNITIES.includes(communityRaw as Community)) {
    redirect('/onboarding?error=1')
  }

  const num_properties = numRaw === '' ? null : Math.max(0, Number.parseInt(numRaw, 10) || 0)

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name,
      community: communityRaw as Community,
      phone,
      num_properties,
      onboarded: true,
    })
    .eq('id', user.id)

  if (error) redirect('/onboarding?error=1')

  revalidatePath('/home')
  redirect('/home')
}
