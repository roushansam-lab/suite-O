'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, User, Scissors, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { formatTime, formatCurrency, cn, getEndTime } from '@/lib/utils'
import { AppointmentStatusBadge, Avatar, EmptyState, Card, Spinner } from '@/components/ui'
import { appointmentApi } from '@/lib/api'
import type { Appointment, Staff, Service, Customer } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  confirmed:   'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
  pending:     'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  in_progress: 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/20',
  completed:   'border-l-green-500 bg-green-50 dark:bg-green-900/20',
  cancelled:   'border-l-red-500 bg-red-50 dark:bg-red-900/20 opacity-60',
}

interface Props {
  salonId: string
  userId: string
  appointments: any[]
  staffList: any[]
  services: any[]
  customers: any[]
  selectedDate: string
}

export default function AppointmentsClient({
  salonId, userId, appointments: initialAppointments,
  staffList, services, customers, selectedDate: initialDate,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null)
  const [currentDate, setCurrentDate] = useState(initialDate)
  const [appointments, setAppointments] = useState(initialAppointments)

  // New booking form state
  const [form, setForm] = useState({
    customer_id: '', staff_id: '', service_id: '',
    appointment_date: initialDate, start_time: '10:00',
    notes: '', source: 'walk_in' as const, pricing_tier: '',
  })
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function navigateDate(direction: 'prev' | 'next') {
    const newDate = format(
      direction === 'next' ? addDays(parseISO(currentDate), 1) : subDays(parseISO(currentDate), 1),
      'yyyy-MM-dd'
    )
    setCurrentDate(newDate)
    router.push(`/appointments?date=${newDate}`)
  }

  async function fetchSlots() {
    if (!form.staff_id || !form.service_id || !form.appointment_date) return
    const service = services.find(s => s.id === form.service_id)
    if (!service) return
    setLoadingSlots(true)
    const slots = await appointmentApi.getAvailableSlots(
      salonId, form.staff_id, form.appointment_date, service.duration_minutes
    )
    setAvailableSlots(slots)
    setLoadingSlots(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_id || !form.staff_id || !form.service_id) {
      toast.error('Please fill all required fields')
      return
    }
    setSubmitting(true)
    const { data, error } = await appointmentApi.create(salonId, userId, form)
    setSubmitting(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success('Appointment booked successfully!')
    setShowModal(false)
    setForm({ customer_id: '', staff_id: '', service_id: '', appointment_date: currentDate, start_time: '10:00', notes: '', source: 'walk_in', pricing_tier: '' })
    startTransition(() => router.refresh())
  }

  async function handleStatusUpdate(apptId: string, status: string) {
    const { error } = await appointmentApi.updateStatus(apptId, status)
    if (error) { toast.error(error); return }
    toast.success(`Appointment ${status}`)
    startTransition(() => router.refresh())
    setSelectedAppt(null)
  }

  const selectedService = services.find(s => s.id === form.service_id)
  const dateLabel = format(parseISO(currentDate), 'EEEE, dd MMMM yyyy')

  return (
    <div className="space-y-6">
      {/* Date Navigator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateDate('prev')}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted/40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-semibold">{dateLabel}</h2>
            <p className="text-xs text-muted-foreground">{appointments.length} appointments</p>
          </div>
          <button
            onClick={() => navigateDate('next')}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted/40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0]
              setCurrentDate(today)
              router.push(`/appointments?date=${today}`)
            }}
            className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted/40 transition-colors"
          >
            Today
          </button>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Booking
        </button>
      </div>

      {/* Appointment List */}
      {appointments.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-8 h-8" />}
          title="No appointments today"
          description="No bookings scheduled for this date. Click 'New Booking' to add one."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
            >
              Add Appointment
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {appointments.map((appt: any) => (
            <div
              key={appt.id}
              onClick={() => setSelectedAppt(appt)}
              className={cn(
                'rounded-xl border-l-4 p-4 cursor-pointer hover:shadow-sm transition-all',
                STATUS_COLORS[appt.status] ?? 'bg-card border-l-gray-300 border border-border'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={appt.customer?.full_name ?? '?'} src={appt.customer?.avatar_url} size="md" />
                  <div className="min-w-0">
                    <div className="font-semibold">{appt.customer?.full_name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />{appt.customer?.phone}
                    </div>
                  </div>
                </div>
                <AppointmentStatusBadge status={appt.status} />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-medium text-foreground">{formatTime(appt.start_time)}</span>
                  <span>–</span>
                  <span>{formatTime(appt.end_time)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Scissors className="w-3.5 h-3.5" />
                  <span className="truncate">{appt.service?.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span className="truncate">{appt.staff?.full_name}</span>
                </div>
              </div>

              {appt.notes && (
                <p className="mt-2 text-xs text-muted-foreground border-t border-current/10 pt-2">{appt.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedAppt(null)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selectedAppt.customer?.full_name}</h3>
                <p className="text-sm text-muted-foreground">{selectedAppt.customer?.phone}</p>
              </div>
              <AppointmentStatusBadge status={selectedAppt.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Service</div>
                <div className="font-medium">{selectedAppt.service?.name}</div>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Stylist</div>
                <div className="font-medium">{selectedAppt.staff?.full_name}</div>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Time</div>
                <div className="font-medium">{formatTime(selectedAppt.start_time)} – {formatTime(selectedAppt.end_time)}</div>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Price</div>
                <div className="font-medium">{formatCurrency(selectedAppt.service_price)}</div>
              </div>
            </div>

            {selectedAppt.notes && (
              <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
                <span className="font-medium text-foreground">Notes: </span>{selectedAppt.notes}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {selectedAppt.status === 'pending' && (
                <button
                  onClick={() => handleStatusUpdate(selectedAppt.id, 'confirmed')}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600"
                >
                  Confirm
                </button>
              )}
              {selectedAppt.status === 'confirmed' && (
                <button
                  onClick={() => handleStatusUpdate(selectedAppt.id, 'in_progress')}
                  className="flex-1 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600"
                >
                  Start Service
                </button>
              )}
              {selectedAppt.status === 'in_progress' && (
                <button
                  onClick={() => handleStatusUpdate(selectedAppt.id, 'completed')}
                  className="flex-1 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600"
                >
                  Mark Complete
                </button>
              )}
              {['pending', 'confirmed'].includes(selectedAppt.status) && (
                <button
                  onClick={() => handleStatusUpdate(selectedAppt.id, 'cancelled')}
                  className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100"
                >
                  Cancel
                </button>
              )}
              {selectedAppt.status === 'completed' && (
                <button
                  onClick={() => {
                    setSelectedAppt(null)
                    router.push(`/billing/new?appointment_id=${selectedAppt.id}`)
                  }}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90"
                >
                  Generate Invoice
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">New Appointment</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Customer */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Customer *</label>
                <select
                  value={form.customer_id}
                  onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select customer…</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>
                  ))}
                </select>
              </div>

              {/* Service */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Service *</label>
                <select
                  value={form.service_id}
                  onChange={e => {
                    setForm(f => ({ ...f, service_id: e.target.value, start_time: '10:00' }))
                    setAvailableSlots([])
                  }}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select service…</option>
                  {services.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {formatCurrency(s.base_price)} ({s.duration_minutes}min)
                    </option>
                  ))}
                </select>
              </div>

              {/* Staff */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Staff *</label>
                <select
                  value={form.staff_id}
                  onChange={e => {
                    setForm(f => ({ ...f, staff_id: e.target.value, start_time: '10:00' }))
                    setAvailableSlots([])
                  }}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select staff…</option>
                  {staffList.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.full_name} — {s.designation ?? 'Stylist'}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Date *</label>
                <input
                  type="date"
                  value={form.appointment_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => {
                    setForm(f => ({ ...f, appointment_date: e.target.value }))
                    setAvailableSlots([])
                  }}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Time Slots */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Time Slot *</label>
                  <button
                    type="button"
                    onClick={fetchSlots}
                    disabled={!form.staff_id || !form.service_id || loadingSlots}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {loadingSlots ? 'Loading…' : 'Check availability'}
                  </button>
                </div>
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto">
                    {availableSlots.map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, start_time: slot }))}
                        className={cn(
                          'py-1.5 text-xs rounded-lg border transition-colors',
                          form.start_time === slot
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    required
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                )}
                {selectedService && form.start_time && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ends at: {formatTime(getEndTime(form.start_time, selectedService.duration_minutes))}
                  </p>
                )}
              </div>

              {/* Source */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Booking Source</label>
                <select
                  value={form.source}
                  onChange={e => setForm(f => ({ ...f, source: e.target.value as any }))}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="walk_in">Walk-in</option>
                  <option value="phone">Phone</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="online">Online</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any special requests or notes…"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Summary */}
              {selectedService && (
                <div className="bg-muted/40 rounded-xl p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Price</span>
                    <span className="font-semibold">{formatCurrency(selectedService.base_price)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{selectedService.duration_minutes} min</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting && <Spinner className="w-4 h-4" />}
                  Book Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
