import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient from './AnalyticsClient'

export const metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: ud } = await supabase.from('users').select('salon_id').eq('id', user.id).single()
  if (!ud?.salon_id) redirect('/setup')

  const salonId = ud.salon_id
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: invoices30 },
    { data: appointmentsByService },
    { data: staffPerformance },
    { data: customerGrowth },
    { data: prevMonthInvoices },
  ] = await Promise.all([
    supabase.from('invoices').select('grand_total, created_at, payment_status')
      .eq('salon_id', salonId).gte('created_at', last30).order('created_at'),
    supabase.from('appointments')
      .select('service_price, service:services(name), status')
      .eq('salon_id', salonId).eq('status', 'completed').gte('created_at', monthStart),
    supabase.from('appointments')
      .select('staff_id, service_price, staff:staff(full_name)')
      .eq('salon_id', salonId).eq('status', 'completed').gte('created_at', monthStart),
    supabase.from('customers')
      .select('created_at').eq('salon_id', salonId).gte('created_at', last30).order('created_at'),
    supabase.from('invoices').select('grand_total')
      .eq('salon_id', salonId).eq('payment_status', 'paid')
      .gte('created_at', prevMonthStart).lte('created_at', prevMonthEnd),
  ])

  // Process revenue chart (daily)
  const revenueByDay: Record<string, number> = {}
  ;(invoices30 ?? []).filter((i: any) => i.payment_status === 'paid').forEach((inv: any) => {
    const d = inv.created_at.split('T')[0]
    revenueByDay[d] = (revenueByDay[d] ?? 0) + Number(inv.grand_total)
  })
  const revenueChart = Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue }))

  // Service popularity
  const serviceMap: Record<string, { count: number; revenue: number }> = {}
  ;(appointmentsByService ?? []).forEach((a: any) => {
    const name = a.service?.name ?? 'Unknown'
    if (!serviceMap[name]) serviceMap[name] = { count: 0, revenue: 0 }
    serviceMap[name].count++
    serviceMap[name].revenue += Number(a.service_price)
  })
  const topServices = Object.entries(serviceMap)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)

  // Staff performance
  const staffMap: Record<string, { name: string; count: number; revenue: number }> = {}
  ;(staffPerformance ?? []).forEach((a: any) => {
    const id = a.staff_id
    const name = a.staff?.full_name ?? 'Unknown'
    if (!staffMap[id]) staffMap[id] = { name, count: 0, revenue: 0 }
    staffMap[id].count++
    staffMap[id].revenue += Number(a.service_price)
  })
  const staffStats = Object.values(staffMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // Totals
  const thisMonthRevenue = (invoices30 ?? [])
    .filter((i: any) => i.payment_status === 'paid' && i.created_at >= monthStart)
    .reduce((s: number, i: any) => s + Number(i.grand_total), 0)
  const prevMonthRevenue = (prevMonthInvoices ?? []).reduce((s: number, i: any) => s + Number(i.grand_total), 0)

  return (
    <AnalyticsClient
      revenueChart={revenueChart}
      topServices={topServices}
      staffStats={staffStats}
      thisMonthRevenue={thisMonthRevenue}
      prevMonthRevenue={prevMonthRevenue}
      totalAppointments={(appointmentsByService ?? []).length}
      newCustomers={(customerGrowth ?? []).length}
    />
  )
}
