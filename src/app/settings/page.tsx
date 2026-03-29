import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase.from('users').select('salon_id, role, full_name').eq('id', user.id).single()
  if (!userData?.salon_id) redirect('/setup')

  const [
    { data: salon },
    { data: services },
    { data: categories },
    { data: membershipPlans },
    { data: coupons },
  ] = await Promise.all([
    supabase.from('salons').select('*').eq('id', userData.salon_id).single(),
    supabase.from('services').select('*, category:service_categories(name, color)').eq('salon_id', userData.salon_id).order('name'),
    supabase.from('service_categories').select('*').eq('salon_id', userData.salon_id).order('sort_order'),
    supabase.from('membership_plans').select('*').eq('salon_id', userData.salon_id),
    supabase.from('coupons').select('*').eq('salon_id', userData.salon_id).order('created_at', { ascending: false }),
  ])

  return (
    <SettingsClient
      salon={salon}
      services={services ?? []}
      categories={categories ?? []}
      membershipPlans={membershipPlans ?? []}
      coupons={coupons ?? []}
      userRole={userData.role}
      userId={user.id}
    />
  )
}
