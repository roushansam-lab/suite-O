import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BillingClient from './BillingClient'

export const metadata = { title: 'Billing & POS' }

export default async function BillingPage({ searchParams }: { searchParams: { tab?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase.from('users').select('salon_id').eq('id', user.id).single()
  if (!userData?.salon_id) redirect('/setup')

  const salonId = userData.salon_id

  const [
    { data: invoices },
    { data: customers },
    { data: services },
    { data: salon },
  ] = await Promise.all([
    supabase.from('invoices')
      .select('*, customer:customers(full_name, phone), payments(*)')
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('customers')
      .select('id, full_name, phone, loyalty_points')
      .eq('salon_id', salonId).eq('is_active', true).order('full_name'),
    supabase.from('services')
      .select('*, category:service_categories(name, color)')
      .eq('salon_id', salonId).eq('is_active', true).order('name'),
    supabase.from('salons').select('name, gst_number, address, phone').eq('id', salonId).single(),
  ])

  return (
    <BillingClient
      salonId={salonId}
      userId={user.id}
      invoices={invoices ?? []}
      customers={customers ?? []}
      services={services ?? []}
      salon={salon}
      activeTab={searchParams.tab ?? 'invoices'}
    />
  )
}
