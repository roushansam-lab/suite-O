import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppointmentsClient from './AppointmentsClient'

export const metadata = { title: 'Appointments' }

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: { date?: string; view?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users').select('salon_id').eq('id', user.id).single()
  if (!userData?.salon_id) redirect('/setup')

  const salonId = userData.salon_id
  const selectedDate = searchParams.date ?? new Date().toISOString().split('T')[0]

  const [
    { data: appointments },
    { data: staffList },
    { data: services },
    { data: customers },
  ] = await Promise.all([
    supabase.from('appointments')
      .select(`
        *,
        customer:customers(id, full_name, phone, avatar_url),
        staff:staff(id, full_name, avatar_url, designation),
        service:services(id, name, duration_minutes, base_price, category_id,
          category:service_categories(name, color))
      `)
      .eq('salon_id', salonId)
      .eq('appointment_date', selectedDate)
      .order('start_time'),
    supabase.from('staff').select('*').eq('salon_id', salonId).eq('is_active', true).order('full_name'),
    supabase.from('services')
      .select('*, category:service_categories(name, color)')
      .eq('salon_id', salonId).eq('is_active', true).order('name'),
    supabase.from('customers')
      .select('id, full_name, phone, loyalty_points')
      .eq('salon_id', salonId).eq('is_active', true).order('full_name'),
  ])

  return (
    <AppointmentsClient
      salonId={salonId}
      userId={user.id}
      appointments={appointments ?? []}
      staffList={staffList ?? []}
      services={services ?? []}
      customers={customers ?? []}
      selectedDate={selectedDate}
    />
  )
}
