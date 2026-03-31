import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('salon_id, full_name, role')
    .eq('id', user.id)
    .single()

  // FIX: /setup route doesn't exist — redirect to login with an error param
  // so the user sees a meaningful message instead of an infinite redirect loop
  if (!userData) redirect('/auth/login?error=no_user_record')
  if (!userData.salon_id) redirect('/auth/login?error=no_salon')

  const salonId = userData.salon_id
  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [
    { data: todayAppointments },
    { data: monthInvoices },
    { data: pendingCount },
    { data: staffList },
    { data: lowStockProducts },
    { data: recentCustomers },
    { data: revenueData },
  ] = await Promise.all([
    supabase.from('appointments')
      .select('*, customer:customers(full_name, phone, avatar_url), service:services(name, duration_minutes), staff:staff(full_name, avatar_url)')
      .eq('salon_id', salonId)
      .eq('appointment_date', today)
      .not('status', 'in', '("cancelled","no_show")')
      .order('start_time'),
    supabase.from('invoices')
      .select('grand_total, created_at')
      .eq('salon_id', salonId)
      .eq('payment_status', 'paid')
      .gte('created_at', monthStart),
    supabase.from('appointments')
      .select('id', { count: 'exact' })
      .eq('salon_id', salonId)
      .eq('status', 'pending')
      .gte('appointment_date', today),
    supabase.from('staff')
      .select('id, full_name, avatar_url, designation, is_active')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .limit(8),
    supabase.from('inventory_products')
      .select('id, name, current_stock, minimum_stock, unit')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .limit(5),
    supabase.from('customers')
      .select('id, full_name, phone, total_visits, total_spent, created_at')
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('invoices')
      .select('grand_total, created_at')
      .eq('salon_id', salonId)
      .eq('payment_status', 'paid')
      .gte('created_at', monthStart)
      .order('created_at'),
  ])

  // Compute stats
  const monthRevenue = (monthInvoices ?? []).reduce((s: number, i: any) => s + Number(i.grand_total), 0)
  const todayRevenue = (monthInvoices ?? [])
    .filter((i: any) => i.created_at?.startsWith(today))
    .reduce((s: number, i: any) => s + Number(i.grand_total), 0)

  // Build revenue chart data (last 30 days grouped)
  const grouped: Record<string, number> = {}
  ;(revenueData ?? []).forEach((inv: any) => {
    const d = inv.created_at?.split('T')[0]
    if (d) grouped[d] = (grouped[d] ?? 0) + Number(inv.grand_total)
  })
  const chartData = Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }))

  // Low stock: filter products where current_stock <= minimum_stock
  const actualLowStock = (lowStockProducts ?? []).filter(
    (p: any) => Number(p.current_stock) <= Number(p.minimum_stock)
  )

  return (
    <DashboardClient
      userName={userData.full_name}
      stats={{
        todayRevenue,
        monthRevenue,
        todayAppointments: todayAppointments?.length ?? 0,
        pendingAppointments: pendingCount?.length ?? 0,
        activeStaff: staffList?.length ?? 0,
        lowStockCount: actualLowStock.length,
      }}
      todayAppointments={todayAppointments ?? []}
      staffList={staffList ?? []}
      lowStockProducts={actualLowStock}
      recentCustomers={recentCustomers ?? []}
      chartData={chartData}
    />
  )
}
