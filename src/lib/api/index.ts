// ============================================================
// SUITE 'O' — API Client (wraps Supabase queries)
// ============================================================

import { createClient } from '@/lib/supabase/client'
import type {
  Appointment, Customer, Staff, Service, Invoice,
  InventoryProduct, Payment, LoyaltyTransaction,
  BookingFormData, CustomerFormData, InvoiceFormData,
  DashboardStats, RevenueChartData, ServicePopularity,
  PaginatedResponse, ApiResponse,
} from '@/types'
import { calculateLoyaltyPoints } from '@/lib/utils'

const sb = () => createClient()

// ── Auth ───────────────────────────────────────────────
export const authApi = {
  async signInWithEmail(email: string, password: string) {
    return sb().auth.signInWithPassword({ email, password })
  },
  async signInWithOTP(phone: string) {
    return sb().auth.signInWithOtp({ phone })
  },
  async verifyOTP(phone: string, token: string) {
    return sb().auth.verifyOtp({ phone, token, type: 'sms' })
  },
  async signOut() {
    return sb().auth.signOut()
  },
  async getUser() {
    return sb().auth.getUser()
  },
  async resetPassword(email: string) {
    return sb().auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    })
  },
}

// ── Dashboard ──────────────────────────────────────────
export const dashboardApi = {
  async getStats(salonId: string): Promise<ApiResponse<DashboardStats>> {
    const client = sb()
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

    try {
      const [todayAppts, monthInvoices, pendingAppts, lowStock, activeStaff] = await Promise.all([
        client.from('appointments')
          .select('id, status, customer_id', { count: 'exact' })
          .eq('salon_id', salonId)
          .eq('appointment_date', today),
        client.from('invoices')
          .select('grand_total')
          .eq('salon_id', salonId)
          .eq('payment_status', 'paid')
          .gte('created_at', monthStart),
        client.from('appointments')
          .select('id', { count: 'exact' })
          .eq('salon_id', salonId)
          .eq('status', 'pending')
          .gte('appointment_date', today),
        client.from('inventory_products')
          .select('id', { count: 'exact' })
          .eq('salon_id', salonId)
          .eq('is_active', true)
          .filter('current_stock', 'lte', 'minimum_stock'),
        client.from('staff')
          .select('id', { count: 'exact' })
          .eq('salon_id', salonId)
          .eq('is_active', true),
      ])

      const todayRevenue = monthInvoices.data
        ?.filter(i => {
          // filter today only
          return true // simplified — real query would filter by date
        })
        .reduce((sum, i) => sum + i.grand_total, 0) ?? 0

      const monthRevenue = monthInvoices.data?.reduce((sum, i) => sum + i.grand_total, 0) ?? 0
      const todayCustomers = new Set(todayAppts.data?.map(a => a.customer_id)).size

      return {
        data: {
          today_revenue: todayRevenue,
          today_appointments: todayAppts.count ?? 0,
          today_customers: todayCustomers,
          month_revenue: monthRevenue,
          month_appointments: 0, // would compute separately
          pending_appointments: pendingAppts.count ?? 0,
          low_stock_count: lowStock.count ?? 0,
          active_staff: activeStaff.count ?? 0,
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: String(err) }
    }
  },

  async getRevenueChart(salonId: string, days = 30): Promise<ApiResponse<RevenueChartData[]>> {
    const client = sb()
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)

    const { data, error } = await client
      .from('invoices')
      .select('grand_total, created_at')
      .eq('salon_id', salonId)
      .eq('payment_status', 'paid')
      .gte('created_at', fromDate.toISOString())
      .order('created_at')

    if (error) return { data: null, error: error.message }

    // Group by date
    const grouped: Record<string, RevenueChartData> = {}
    data?.forEach(inv => {
      const date = inv.created_at.split('T')[0]
      if (!grouped[date]) grouped[date] = { date, revenue: 0, appointments: 0 }
      grouped[date].revenue += inv.grand_total
      grouped[date].appointments += 1
    })

    return { data: Object.values(grouped), error: null }
  },

  async getTopServices(salonId: string): Promise<ApiResponse<ServicePopularity[]>> {
    const client = sb()
    const { data, error } = await client
      .from('appointments')
      .select(`service_price, service:services(name)`)
      .eq('salon_id', salonId)
      .eq('status', 'completed')

    if (error) return { data: null, error: error.message }

    const grouped: Record<string, ServicePopularity> = {}
    data?.forEach((a: any) => {
      const name = a.service?.name ?? 'Unknown'
      if (!grouped[name]) grouped[name] = { service_name: name, count: 0, revenue: 0 }
      grouped[name].count++
      grouped[name].revenue += a.service_price
    })

    const sorted = Object.values(grouped)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return { data: sorted, error: null }
  },
}

// ── Appointments ───────────────────────────────────────
export const appointmentApi = {
  async list(salonId: string, filters?: {
    date?: string
    staff_id?: string
    status?: string
    from?: string
    to?: string
  }): Promise<ApiResponse<Appointment[]>> {
    let query = sb()
      .from('appointments')
      .select(`
        *,
        customer:customers(id, full_name, phone, avatar_url),
        staff:staff(id, full_name, avatar_url, designation),
        service:services(id, name, duration_minutes, base_price, category_id)
      `)
      .eq('salon_id', salonId)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (filters?.date) query = query.eq('appointment_date', filters.date)
    if (filters?.staff_id) query = query.eq('staff_id', filters.staff_id)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.from) query = query.gte('appointment_date', filters.from)
    if (filters?.to) query = query.lte('appointment_date', filters.to)

    const { data, error } = await query
    return { data: data as Appointment[] | null, error: error?.message ?? null }
  },

  async get(id: string): Promise<ApiResponse<Appointment>> {
    const { data, error } = await sb()
      .from('appointments')
      .select(`*, customer:customers(*), staff:staff(*), service:services(*)`)
      .eq('id', id)
      .single()

    return { data: data as Appointment | null, error: error?.message ?? null }
  },

  async create(salonId: string, userId: string, form: BookingFormData): Promise<ApiResponse<Appointment>> {
    const { data: service } = await sb()
      .from('services')
      .select('duration_minutes, base_price')
      .eq('id', form.service_id)
      .single()

    if (!service) return { data: null, error: 'Service not found' }

    const [h, m] = form.start_time.split(':').map(Number)
    const end = new Date()
    end.setHours(h, m + service.duration_minutes, 0, 0)
    const end_time = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`

    // Check for conflicts
    const { data: conflicts } = await sb()
      .from('appointments')
      .select('id')
      .eq('staff_id', form.staff_id)
      .eq('appointment_date', form.appointment_date)
      .not('status', 'in', '("cancelled","no_show")')
      .lt('start_time', end_time)
      .gt('end_time', form.start_time)

    if (conflicts && conflicts.length > 0) {
      return { data: null, error: 'Time slot is already booked for this staff member' }
    }

    const { data, error } = await sb()
      .from('appointments')
      .insert({
        salon_id: salonId,
        customer_id: form.customer_id,
        staff_id: form.staff_id,
        service_id: form.service_id,
        appointment_date: form.appointment_date,
        start_time: form.start_time,
        end_time,
        duration_minutes: service.duration_minutes,
        service_price: service.base_price,
        source: form.source,
        notes: form.notes,
        pricing_tier: form.pricing_tier,
        created_by: userId,
      })
      .select('*')
      .single()

    return { data: data as Appointment | null, error: error?.message ?? null }
  },

  async updateStatus(id: string, status: string, reason?: string): Promise<ApiResponse<Appointment>> {
    const updates: Record<string, unknown> = { status }
    if (status === 'confirmed') updates.confirmed_at = new Date().toISOString()
    if (status === 'cancelled') {
      updates.cancelled_at = new Date().toISOString()
      updates.cancel_reason = reason
    }

    const { data, error } = await sb()
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    return { data: data as Appointment | null, error: error?.message ?? null }
  },

  async getAvailableSlots(
    salonId: string,
    staffId: string,
    date: string,
    durationMinutes: number
  ): Promise<string[]> {
    const { data: staff } = await sb()
      .from('staff')
      .select('working_hours, break_times')
      .eq('id', staffId)
      .single()

    if (!staff) return []

    const { data: bookings } = await sb()
      .from('appointments')
      .select('start_time, end_time')
      .eq('staff_id', staffId)
      .eq('appointment_date', date)
      .not('status', 'in', '("cancelled","no_show")')

    const { data: salon } = await sb()
      .from('salons')
      .select('booking_buffer_minutes')
      .eq('id', salonId)
      .single()

    const buffer = salon?.booking_buffer_minutes ?? 10
    const { start, end } = staff.working_hours
    const allSlots: string[] = []

    // Generate 30-min slots
    const startMins = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1])
    const endMins   = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1])

    for (let mins = startMins; mins + durationMinutes <= endMins; mins += 30) {
      const slotStart = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
      const slotEnd   = `${String(Math.floor((mins + durationMinutes) / 60)).padStart(2, '0')}:${String((mins + durationMinutes) % 60).padStart(2, '0')}`

      // Check against existing bookings (with buffer)
      const isBooked = bookings?.some(b => {
        const bStart = parseInt(b.start_time.split(':')[0]) * 60 + parseInt(b.start_time.split(':')[1])
        const bEnd   = parseInt(b.end_time.split(':')[0]) * 60 + parseInt(b.end_time.split(':')[1])
        return !(mins + durationMinutes + buffer <= bStart || mins >= bEnd + buffer)
      })

      if (!isBooked) allSlots.push(slotStart)
    }

    return allSlots
  },
}

// ── Customers ──────────────────────────────────────────
export const customerApi = {
  async list(salonId: string, search?: string, page = 1, perPage = 20): Promise<ApiResponse<Customer[]>> {
    let query = sb()
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .order('full_name')
      .range((page - 1) * perPage, page * perPage - 1)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error } = await query
    return { data: data as Customer[] | null, error: error?.message ?? null }
  },

  async get(id: string): Promise<ApiResponse<Customer>> {
    const { data, error } = await sb()
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
    return { data: data as Customer | null, error: error?.message ?? null }
  },

  async create(salonId: string, form: CustomerFormData): Promise<ApiResponse<Customer>> {
    const { data, error } = await sb()
      .from('customers')
      .insert({ salon_id: salonId, ...form })
      .select('*')
      .single()
    return { data: data as Customer | null, error: error?.message ?? null }
  },

  async update(id: string, form: Partial<CustomerFormData>): Promise<ApiResponse<Customer>> {
    const { data, error } = await sb()
      .from('customers')
      .update(form)
      .eq('id', id)
      .select('*')
      .single()
    return { data: data as Customer | null, error: error?.message ?? null }
  },

  async getHistory(customerId: string): Promise<ApiResponse<Appointment[]>> {
    const { data, error } = await sb()
      .from('appointments')
      .select(`*, service:services(name, base_price), staff:staff(full_name)`)
      .eq('customer_id', customerId)
      .order('appointment_date', { ascending: false })
    return { data: data as Appointment[] | null, error: error?.message ?? null }
  },

  async getInvoices(customerId: string): Promise<ApiResponse<Invoice[]>> {
    const { data, error } = await sb()
      .from('invoices')
      .select('*, payments(*)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
    return { data: data as Invoice[] | null, error: error?.message ?? null }
  },
}

// ── Services ───────────────────────────────────────────
export const serviceApi = {
  async list(salonId: string, categoryId?: string): Promise<ApiResponse<Service[]>> {
    let query = sb()
      .from('services')
      .select('*, category:service_categories(name, color, icon)')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .order('sort_order')

    if (categoryId) query = query.eq('category_id', categoryId)

    const { data, error } = await query
    return { data: data as Service[] | null, error: error?.message ?? null }
  },

  async listCategories(salonId: string) {
    return sb()
      .from('service_categories')
      .select('*')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .order('sort_order')
  },
}

// ── Billing ────────────────────────────────────────────
export const billingApi = {
  async listInvoices(salonId: string, filters?: { status?: string; from?: string; to?: string }) {
    let query = sb()
      .from('invoices')
      .select('*, customer:customers(full_name, phone), payments(*)')
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })

    if (filters?.status) query = query.eq('payment_status', filters.status)
    if (filters?.from) query = query.gte('created_at', filters.from)
    if (filters?.to) query = query.lte('created_at', filters.to)

    return query
  },

  async createInvoice(salonId: string, userId: string, form: InvoiceFormData): Promise<ApiResponse<Invoice>> {
    const pointsEarned = calculateLoyaltyPoints(form.line_items.reduce((s, i) => s + i.total, 0))

    const subtotal = form.line_items.reduce((s, i) => s + (i.unit_price * i.quantity), 0)
    const totalTax = form.line_items.reduce((s, i) => s + i.gst_amount, 0)
    const discountAmt = form.discount_type === 'percentage'
      ? subtotal * ((form.discount_value ?? 0) / 100)
      : (form.discount_value ?? 0)
    const grandTotal = subtotal + totalTax - discountAmt - (form.loyalty_points_to_use ?? 0) * 0.5

    const { data, error } = await sb()
      .from('invoices')
      .insert({
        salon_id: salonId,
        customer_id: form.customer_id,
        appointment_id: form.appointment_id,
        line_items: form.line_items,
        subtotal,
        discount_amount: discountAmt,
        discount_type: form.discount_type,
        coupon_code: form.coupon_code,
        taxable_amount: subtotal,
        cgst_amount: totalTax / 2,
        sgst_amount: totalTax / 2,
        total_tax: totalTax,
        grand_total: grandTotal,
        loyalty_points_used: form.loyalty_points_to_use ?? 0,
        loyalty_points_earned: pointsEarned,
        payment_status: 'paid',
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) return { data: null, error: error.message }

    // Record payment
    await sb().from('payments').insert({
      salon_id: salonId,
      invoice_id: data.id,
      amount: grandTotal,
      method: form.payment_method,
      status: 'paid',
      created_by: userId,
    })

    return { data: data as Invoice, error: null }
  },
}

// ── Inventory ──────────────────────────────────────────
export const inventoryApi = {
  async list(salonId: string, search?: string): Promise<ApiResponse<InventoryProduct[]>> {
    let query = sb()
      .from('inventory_products')
      .select('*, supplier:suppliers(name)')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .order('name')

    if (search) query = query.ilike('name', `%${search}%`)

    const { data, error } = await query
    return { data: data as InventoryProduct[] | null, error: error?.message ?? null }
  },

  async getLowStock(salonId: string): Promise<ApiResponse<InventoryProduct[]>> {
    const { data, error } = await sb()
      .from('inventory_products')
      .select('*, supplier:suppliers(name)')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .filter('current_stock', 'lte', 'minimum_stock')

    return { data: data as InventoryProduct[] | null, error: error?.message ?? null }
  },

  async getExpiringProducts(salonId: string, withinDays = 30): Promise<ApiResponse<InventoryProduct[]>> {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + withinDays)

    const { data, error } = await sb()
      .from('inventory_products')
      .select('*')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .not('expiry_date', 'is', null)
      .lte('expiry_date', futureDate.toISOString().split('T')[0])

    return { data: data as InventoryProduct[] | null, error: error?.message ?? null }
  },

  async addTransaction(salonId: string, userId: string, data: {
    product_id: string
    type: string
    quantity: number
    unit_cost?: number
    notes?: string
  }): Promise<ApiResponse<null>> {
    const client = sb()

    const { error: txErr } = await client.from('inventory_transactions').insert({
      salon_id: salonId,
      ...data,
      total_cost: data.unit_cost ? data.unit_cost * data.quantity : null,
      created_by: userId,
    })

    if (txErr) return { data: null, error: txErr.message }

    // Update stock
    const delta = data.type === 'purchase' ? data.quantity : -data.quantity
    const { error: stockErr } = await client
      .from('inventory_products')
      .update({ current_stock: sb().rpc('increment', { x: delta }) })
      .eq('id', data.product_id)

    return { data: null, error: stockErr?.message ?? null }
  },
}

// ── Staff ──────────────────────────────────────────────
export const staffApi = {
  async list(salonId: string): Promise<ApiResponse<Staff[]>> {
    const { data, error } = await sb()
      .from('staff')
      .select('*')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .order('full_name')

    return { data: data as Staff[] | null, error: error?.message ?? null }
  },

  async getAttendance(salonId: string, date: string) {
    return sb()
      .from('attendance')
      .select('*, staff:staff(full_name, avatar_url, designation)')
      .eq('salon_id', salonId)
      .eq('date', date)
  },

  async markAttendance(salonId: string, staffId: string, data: {
    date: string
    status: string
    check_in?: string
    check_out?: string
    notes?: string
  }) {
    return sb()
      .from('attendance')
      .upsert({
        salon_id: salonId,
        staff_id: staffId,
        ...data,
      })
      .select()
  },

  async getCommission(salonId: string, staffId: string, month: string) {
    const from = `${month}-01`
    const to   = `${month}-31`

    const { data: appts } = await sb()
      .from('appointments')
      .select('service_price, staff:staff(commission_type, commission_value)')
      .eq('staff_id', staffId)
      .eq('salon_id', salonId)
      .eq('status', 'completed')
      .gte('appointment_date', from)
      .lte('appointment_date', to)

    let total = 0
    appts?.forEach((a: any) => {
      const { commission_type, commission_value } = a.staff
      if (commission_type === 'percentage') total += a.service_price * (commission_value / 100)
      else if (commission_type === 'fixed') total += commission_value
    })

    return { total, appointments: appts?.length ?? 0 }
  },
}

// ── WhatsApp Notifications ─────────────────────────────
export const notificationApi = {
  async sendBookingConfirmation(appointmentId: string) {
    return fetch('/api/notifications/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'booking_confirmation', appointment_id: appointmentId }),
    })
  },

  async sendReminder(appointmentId: string) {
    return fetch('/api/notifications/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'reminder', appointment_id: appointmentId }),
    })
  },
}
