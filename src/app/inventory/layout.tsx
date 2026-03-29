import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('full_name, salon_id')
    .eq('id', user.id)
    .single()

  const { data: salon } = userData?.salon_id
    ? await supabase.from('salons').select('name').eq('id', userData.salon_id).single()
    : { data: null }

  const initials = (userData?.full_name ?? user.email ?? 'U')
    .split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        salonName={salon?.name ?? 'Suite O'}
        userInitials={initials}
        userName={userData?.full_name ?? user.email ?? 'User'}
      />
      {/* Main content — offset by sidebar width on large screens */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all duration-300">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 scroll-y">
          {children}
        </main>
      </div>
    </div>
  )
}
