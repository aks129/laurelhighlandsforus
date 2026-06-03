export type Community = 'hidden_valley' | 'seven_springs' | 'other'
export type Role = 'member' | 'admin'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  community: Community | null
  num_properties: number | null
  role: Role
  onboarded: boolean
  created_at: string
}

export function isProfileComplete(profile: Profile): boolean {
  return Boolean(profile.full_name && profile.community)
}

export const COMMUNITY_LABELS: Record<Community, string> = {
  hidden_valley: 'Hidden Valley',
  seven_springs: 'Seven Springs',
  other: 'Other',
}
