import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, differenceInMinutes, addMinutes, isToday, isTomorrow } from 'date-fns'

// ── Tailwind helper ────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Currency ───────────────────────────────────────────
export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n)
}

// ── Date / Time ────────────────────────────────────────
export function formatDate(dateStr: string | Date, fmt = 'dd MMM yyyy'): string {
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  return format(date, fmt)
}

export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return format(d, 'h:mm a')
}

export function formatDateTime(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`
  if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`
  return format(date, 'dd MMM, h:mm a')
}

export function getEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number)
  const start = new Date()
  start.setHours(h, m, 0, 0)
  const end = addMinutes(start, durationMinutes)
  return format(end, 'HH:mm')
}

export function timeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes = 30
): string[] {
  const slots: string[] = []
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const start = new Date()
  start.setHours(sh, sm, 0, 0)
  const end = new Date()
  end.setHours(eh, em, 0, 0)

  let current = start
  while (current < end) {
    slots.push(format(current, 'HH:mm'))
    current = addMinutes(current, intervalMinutes)
  }
  return slots
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ── GST Calculations ───────────────────────────────────
export interface GSTBreakdown {
  baseAmount: number
  cgst: number
  sgst: number
  igst: number
  totalTax: number
  grandTotal: number
}

export function calculateGST(
  amount: number,
  gstRate: number,
  isInclusive = false,
  isInterState = false
): GSTBreakdown {
  let baseAmount: number
  let totalTax: number

  if (isInclusive) {
    baseAmount = amount / (1 + gstRate / 100)
    totalTax = amount - baseAmount
  } else {
    baseAmount = amount
    totalTax = amount * (gstRate / 100)
  }

  const cgst = isInterState ? 0 : totalTax / 2
  const sgst = isInterState ? 0 : totalTax / 2
  const igst = isInterState ? totalTax : 0

  return {
    baseAmount: round2(baseAmount),
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    totalTax: round2(totalTax),
    grandTotal: round2(baseAmount + totalTax),
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── Loyalty Points ─────────────────────────────────────
export const POINTS_PER_RUPEE = 0.01 // 1 point per ₹100 spent
export const RUPEE_PER_POINT  = 0.5  // ₹0.5 per point redeemed

export function calculateLoyaltyPoints(amount: number): number {
  return Math.floor(amount * POINTS_PER_RUPEE)
}

export function pointsToRupees(points: number): number {
  return points * RUPEE_PER_POINT
}

// ── String helpers ─────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

export function truncate(str: string, length = 30): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ── Appointment helpers ────────────────────────────────
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending:     'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed:   'bg-blue-100 text-blue-800 border-blue-200',
    in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
    completed:   'bg-green-100 text-green-800 border-green-200',
    cancelled:   'bg-red-100 text-red-800 border-red-200',
    no_show:     'bg-gray-100 text-gray-800 border-gray-200',
  }
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
}

export function getPaymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending:  'bg-yellow-100 text-yellow-800',
    paid:     'bg-green-100 text-green-800',
    partial:  'bg-orange-100 text-orange-800',
    refunded: 'bg-blue-100 text-blue-800',
    failed:   'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// ── Phone validation (Indian) ──────────────────────────
export function isValidIndianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  return /^(\+91|91|0)?[6-9]\d{9}$/.test(cleaned)
}

export function formatIndianPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '')
  const digits = cleaned.replace(/^(91|0)/, '')
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  return phone
}

// ── Date helpers ───────────────────────────────────────
export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const date = new Date(year, month, 1)
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

export function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = []
  const start = new Date(startDate)
  start.setDate(start.getDate() - start.getDay())
  for (let i = 0; i < 7; i++) {
    days.push(new Date(start))
    start.setDate(start.getDate() + 1)
  }
  return days
}

// ── Local storage ──────────────────────────────────────
export const storage = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : fallback
    } catch {
      return fallback
    }
  },
  set(key: string, value: unknown): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  },
  remove(key: string): void {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(key)
  },
}
