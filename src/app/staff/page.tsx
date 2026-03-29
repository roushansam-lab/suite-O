import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StaffClient from './StaffClient'

export const metadata = { title: 'Staff Management' }

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase.from('users').select('salon_id, role').eq('id', user.id).single()
  if (!userData?.salon_id) redirect('/setup')

  const salonId = userData.salon_id
  const today = new Date().toISOString().split('T')[0]
  const monthStr = new Date().toISOString().slice(0, 7) // YYYY-MM

  const [
    { data: staffList },
    { data: todayAttendance },
    { data: monthAppointments },
  ] = await Promise.all([
    supabase.from('staff')
      .select('*')
      .eq('salon_id', salonId)
      .order('full_name'),
    supabase.from('attendance')
      .select('*, staff:staff(full_name)')
      .eq('salon_id', salonId)
      .eq('date', today),
    supabase.from('appointments')
      .select('staff_id, service_price')
      .eq('salon_id', salonId)
      .eq('status', 'completed')
      .gte('appointment_date', `${monthStr}-01`)
      .lte('appointment_date', `${monthStr}-31`),
  ])

  // Compute commission per staff
  const commissionMap: Record<string, number> = {}
  const appointmentCountMap: Record<string, number> = {}
  ;(monthAppointments ?? []).forEach((a: any) => {
    commissionMap[a.staff_id] = (commissionMap[a.staff_id] ?? 0) + Number(a.service_price)
    appointmentCountMap[a.staff_id] = (appointmentCountMap[a.staff_id] ?? 0) + 1
  })

  const staffWithStats = (staffList ?? []).map((s: any) => {
    const revenue = commissionMap[s.id] ?? 0
    const commission = s.commission_type === 'percentage'
      ? revenue * (s.commission_value / 100)
      : s.commission_type === 'fixed'
      ? (appointmentCountMap[s.id] ?? 0) * s.commission_value
      : 0
    const attendance = todayAttendance?.find((a: any) => a.staff_id === s.id)
    return {
      ...s,
      month_revenue: revenue,
      month_appointments: appointmentCountMap[s.id] ?? 0,
      month_commission: commission,
      today_status: attendance?.status ?? null,
      check_in: attendance?.check_in ?? null,
      check_out: attendance?.check_out ?? null,
    }
  })

  return (
    <StaffClient
      salonId={salonId}
      userId={user.id}
      staffList={staffWithStats}
      canManage={['admin', 'manager', 'super_admin'].includes(userData.role)}
    />
  )
}
