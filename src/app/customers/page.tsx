import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CustomersClient from './CustomersClient'

export const metadata = { title: 'Customers' }

export default async function CustomersPage({
  searchParams,
}: { searchParams: { q?: string; page?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users').select('salon_id').eq('id', user.id).single()
  if (!userData?.salon_id) redirect('/setup')

  const salonId = userData.salon_id
  const search = searchParams.q ?? ''
  const page = parseInt(searchParams.page ?? '1')
  const perPage = 20

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
    )
  }

  const { data: customers, count } = await query

  return (
    <CustomersClient
      salonId={salonId}
      customers={customers ?? []}
      total={count ?? 0}
      page={page}
      perPage={perPage}
      search={search}
    />
  )
}
