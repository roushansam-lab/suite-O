// ============================================================
// SUITE 'O' — Core TypeScript Types
// ============================================================

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'staff' | 'receptionist'
export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'net_banking' | 'wallet' | 'split'
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded' | 'failed'
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'
export type InventoryTransactionType = 'purchase' | 'usage' | 'adjustment' | 'return' | 'expired'
export type LoyaltyTransactionType = 'earned' | 'redeemed' | 'expired' | 'bonus'

// ── Salon ──────────────────────────────────────────────
export interface Salon {
  id: string
  name: string
  slug: string
  logo_url: string | null
  cover_url: string | null
  phone: string
  email: string | null
  address: string | null
  city: string
  state: string
  pincode: string | null
  gst_number: string | null
  currency: string
  timezone: string
  working_hours: WorkingHours
  booking_buffer_minutes: number
  max_advance_booking_days: number
  auto_confirm_bookings: boolean
  settings: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkingHours {
  monday:    DaySchedule
  tuesday:   DaySchedule
  wednesday: DaySchedule
  thursday:  DaySchedule
  friday:    DaySchedule
  saturday:  DaySchedule
  sunday:    DaySchedule
}

export interface DaySchedule {
  open: string    // "09:00"
  close: string   // "20:00"
  is_open: boolean
}

// ── User ──────────────────────────────────────────────
export interface User {
  id: string
  salon_id: string | null
  role: UserRole
  full_name: string
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  last_login: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ── Staff ─────────────────────────────────────────────
export interface Staff {
  id: string
  salon_id: string
  user_id: string | null
  full_name: string
  phone: string
  email: string | null
  avatar_url: string | null
  designation: string | null
  bio: string | null
  gender: Gender | null
  date_of_birth: string | null
  date_of_joining: string
  specializations: string[]
  working_days: number[]
  working_hours: { start: string; end: string }
  break_times: BreakTime[]
  commission_type: 'percentage' | 'fixed' | 'none'
  commission_value: number
  salary: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BreakTime {
  start: string
  end: string
  label?: string
}

// ── Service ───────────────────────────────────────────
export interface ServiceCategory {
  id: string
  salon_id: string
  name: string
  icon: string | null
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Service {
  id: string
  salon_id: string
  category_id: string | null
  name: string
  description: string | null
  duration_minutes: number
  base_price: number
  gst_rate: number
  is_gst_inclusive: boolean
  pricing_tiers: PricingTier[]
  add_ons: ServiceAddOn[]
  image_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  // Joined
  category?: ServiceCategory
}

export interface PricingTier {
  label: string
  price: number
}

export interface ServiceAddOn {
  id: string
  name: string
  price: number
  duration_minutes?: number
}

// ── Customer ──────────────────────────────────────────
export interface Customer {
  id: string
  salon_id: string
  full_name: string
  phone: string
  email: string | null
  gender: Gender | null
  date_of_birth: string | null
  anniversary_date: string | null
  avatar_url: string | null
  address: string | null
  city: string | null
  referred_by: string | null
  tags: string[]
  notes: string | null
  skin_type: string | null
  hair_type: string | null
  allergies: string | null
  preferences: Record<string, unknown>
  total_visits: number
  total_spent: number
  loyalty_points: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ── Appointment ───────────────────────────────────────
export interface Appointment {
  id: string
  salon_id: string
  customer_id: string
  staff_id: string
  service_id: string
  status: AppointmentStatus
  appointment_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  service_price: number
  add_ons: BookingAddOn[]
  pricing_tier: string | null
  notes: string | null
  internal_notes: string | null
  source: 'online' | 'walk_in' | 'phone' | 'whatsapp'
  reminder_sent: boolean
  confirmed_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  customer?: Customer
  staff?: Staff
  service?: Service
}

export interface BookingAddOn {
  id: string
  name: string
  price: number
}

// ── Invoice ───────────────────────────────────────────
export interface Invoice {
  id: string
  salon_id: string
  invoice_number: string
  customer_id: string
  appointment_id: string | null
  line_items: InvoiceLineItem[]
  subtotal: number
  discount_amount: number
  discount_type: 'percentage' | 'fixed' | null
  coupon_code: string | null
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  total_tax: number
  grand_total: number
  loyalty_points_used: number
  loyalty_points_earned: number
  payment_status: PaymentStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  customer?: Customer
  payments?: Payment[]
}

export interface InvoiceLineItem {
  service_id?: string
  product_id?: string
  name: string
  quantity: number
  unit_price: number
  gst_rate: number
  gst_amount: number
  discount: number
  total: number
}

// ── Payment ───────────────────────────────────────────
export interface Payment {
  id: string
  salon_id: string
  invoice_id: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  transaction_id: string | null
  upi_ref: string | null
  notes: string | null
  paid_at: string
  created_by: string | null
  created_at: string
}

// ── Inventory ─────────────────────────────────────────
export interface InventoryProduct {
  id: string
  salon_id: string
  supplier_id: string | null
  name: string
  sku: string | null
  category: string | null
  description: string | null
  unit: string
  current_stock: number
  minimum_stock: number
  maximum_stock: number | null
  cost_price: number | null
  selling_price: number | null
  expiry_date: string | null
  is_retail: boolean
  is_active: boolean
  image_url: string | null
  created_at: string
  updated_at: string
  // Joined
  supplier?: Supplier
}

export interface Supplier {
  id: string
  salon_id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  gst_number: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface InventoryTransaction {
  id: string
  salon_id: string
  product_id: string
  type: InventoryTransactionType
  quantity: number
  unit_cost: number | null
  total_cost: number | null
  reference_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  product?: InventoryProduct
}

// ── Loyalty ───────────────────────────────────────────
export interface LoyaltyTransaction {
  id: string
  salon_id: string
  customer_id: string
  type: LoyaltyTransactionType
  points: number
  reference_id: string | null
  description: string | null
  expires_at: string | null
  created_at: string
}

// ── Attendance ────────────────────────────────────────
export interface Attendance {
  id: string
  salon_id: string
  staff_id: string
  date: string
  check_in: string | null
  check_out: string | null
  break_minutes: number
  status: 'present' | 'absent' | 'half_day' | 'leave'
  notes: string | null
  created_at: string
  staff?: Staff
}

// ── Analytics ─────────────────────────────────────────
export interface DashboardStats {
  today_revenue: number
  today_appointments: number
  today_customers: number
  month_revenue: number
  month_appointments: number
  pending_appointments: number
  low_stock_count: number
  active_staff: number
}

export interface RevenueChartData {
  date: string
  revenue: number
  appointments: number
}

export interface ServicePopularity {
  service_name: string
  count: number
  revenue: number
}

// ── API Response ──────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  per_page: number
}

// ── Form Types ────────────────────────────────────────
export interface BookingFormData {
  customer_id: string
  staff_id: string
  service_id: string
  appointment_date: string
  start_time: string
  pricing_tier?: string
  add_ons?: string[]
  notes?: string
  source: 'online' | 'walk_in' | 'phone' | 'whatsapp'
}

export interface InvoiceFormData {
  customer_id: string
  appointment_id?: string
  line_items: InvoiceLineItem[]
  discount_type?: 'percentage' | 'fixed'
  discount_value?: number
  coupon_code?: string
  loyalty_points_to_use?: number
  payment_method: PaymentMethod
  notes?: string
}

export interface CustomerFormData {
  full_name: string
  phone: string
  email?: string
  gender?: Gender
  date_of_birth?: string
  anniversary_date?: string
  skin_type?: string
  hair_type?: string
  allergies?: string
  notes?: string
  tags?: string[]
}
