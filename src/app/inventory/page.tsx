import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InventoryClient from './InventoryClient'

export const metadata = { title: 'Inventory' }

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase.from('users').select('salon_id').eq('id', user.id).single()
  if (!userData?.salon_id) redirect('/setup')

  const salonId = userData.salon_id
  const today = new Date().toISOString().split('T')[0]
  const expiryWarningDate = new Date()
  expiryWarningDate.setDate(expiryWarningDate.getDate() + 30)

  const [
    { data: products },
    { data: suppliers },
    { data: recentTransactions },
  ] = await Promise.all([
    supabase.from('inventory_products')
      .select('*, supplier:suppliers(name)')
      .eq('salon_id', salonId).eq('is_active', true).order('name'),
    supabase.from('suppliers').select('*').eq('salon_id', salonId).eq('is_active', true).order('name'),
    supabase.from('inventory_transactions')
      .select('*, product:inventory_products(name, unit)')
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const lowStock = (products ?? []).filter((p: any) => Number(p.current_stock) <= Number(p.minimum_stock))
  const expiring = (products ?? []).filter((p: any) =>
    p.expiry_date && new Date(p.expiry_date) <= expiryWarningDate
  )

  return (
    <InventoryClient
      salonId={salonId}
      userId={user.id}
      products={products ?? []}
      suppliers={suppliers ?? []}
      recentTransactions={recentTransactions ?? []}
      lowStockCount={lowStock.length}
      expiringCount={expiring.length}
    />
  )
}
