'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Clock, CheckCircle2, XCircle, Phone, Mail, Calendar, IndianRupee } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { formatCurrency, cn } from '@/lib/utils'
import { Avatar, Badge, StatCard, Spinner, EmptyState } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

interface Props {
  salonId: string
  userId: string
  staffList: any[]
  canManage: boolean
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function StaffClient({ salonId, userId, staffList, canManage }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState<any | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<'staff' | 'attendance'>('staff')

  const [addForm, setAddForm] = useState({
    full_name: '', phone: '', email: '', designation: '',
    commission_type: 'percentage', commission_value: '20',
    date_of_joining: new Date().toISOString().split('T')[0],
    working_hours_start: '09:00', working_hours_end: '20:00',
    working_days: [1, 2, 3, 4, 5, 6],
    specializations: '',
  })

  const [attendanceForm, setAttendanceForm] = useState({
    status: 'present', check_in: '', check_out: '', notes: '',
  })

  const activeStaff = staffList.filter(s => s.is_active)
  const totalCommission = staffList.reduce((s, st) => s + (st.month_commission ?? 0), 0)
  const totalRevenue = staffList.reduce((s, st) => s + (st.month_revenue ?? 0), 0)
  const todayPresent = staffList.filter(s => ['present', 'half_day'].includes(s.today_status)).length

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.full_name || !addForm.phone) { toast.error('Name and phone required'); return }
    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.from('staff').insert({
      salon_id: salonId,
      full_name: addForm.full_name,
      phone: addForm.phone,
      email: addForm.email || null,
      designation: addForm.designation || null,
      commission_type: addForm.commission_type,
      commission_value: Number(addForm.commission_value),
      date_of_joining: addForm.date_of_joining,
      working_hours: { start: addForm.working_hours_start, end: addForm.working_hours_end },
      working_days: addForm.working_days,
      specializations: addForm.specializations
        ? addForm.specializations.split(',').map(s => s.trim())
        : [],
    })
    setSubmitting(false)
    if (error) { toast.error(error.message); return }
    toast.success('Staff member added!')
    setShowAddModal(false)
    startTransition(() => router.refresh())
  }

  async function handleMarkAttendance(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('attendance').upsert({
      salon_id: salonId,
      staff_id: showAttendanceModal.id,
      date: today,
      status: attendanceForm.status,
      check_in: attendanceForm.check_in ? `${today}T${attendanceForm.check_in}:00` : null,
      check_out: attendanceForm.check_out ? `${today}T${attendanceForm.check_out}:00` : null,
      notes: attendanceForm.notes || null,
    })
    setSubmitting(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Attendance marked for ${showAttendanceModal.full_name}`)
    setShowAttendanceModal(null)
    startTransition(() => router.refresh())
  }

  function getAttendanceBadge(status: string | null) {
    if (!status) return <Badge variant="outline" className="text-xs">Not marked</Badge>
    const configs: Record<string, { label: string; variant: any }> = {
      present:  { label: 'Present',  variant: 'success' },
      absent:   { label: 'Absent',   variant: 'danger' },
      half_day: { label: 'Half Day', variant: 'warning' },
      leave:    { label: 'On Leave', variant: 'info' },
    }
    const c = configs[status] ?? { label: status, variant: 'default' }
    return <Badge variant={c.variant}>{c.label}</Badge>
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Staff" value={activeStaff.length} icon={<UserPlus className="w-5 h-5 text-primary" />} iconBg="bg-primary/10" />
        <StatCard title="Present Today" value={todayPresent} icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} iconBg="bg-green-50 dark:bg-green-900/20" change={`${activeStaff.length - todayPresent} absent/leave`} changeType="neutral" />
        <StatCard title="Monthly Revenue" value={formatCurrency(totalRevenue)} icon={<IndianRupee className="w-5 h-5 text-blue-500" />} iconBg="bg-blue-50 dark:bg-blue-900/20" />
        <StatCard title="Commission Due" value={formatCurrency(totalCommission)} icon={<IndianRupee className="w-5 h-5 text-amber-500" />} iconBg="bg-amber-50 dark:bg-amber-900/20" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-muted/40 rounded-xl">
          {(['staff', 'attendance'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors',
                tab === t ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {t === 'staff' ? 'Staff List' : "Today's Attendance"}
            </button>
          ))}
        </div>
        {canManage && (
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90">
            <UserPlus className="w-4 h-4" />Add Staff
          </button>
        )}
      </div>

      {tab === 'staff' && (
        staffList.length === 0 ? (
          <EmptyState icon={<UserPlus className="w-8 h-8" />} title="No staff members" description="Add your team to get started" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {staffList.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar name={s.full_name} src={s.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground">{s.designation ?? 'Stylist'}</div>
                    {!s.is_active && <Badge variant="danger" className="mt-1">Inactive</Badge>}
                  </div>
                  {getAttendanceBadge(s.today_status)}
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{s.phone}</div>
                  {s.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{s.email}</span></div>}
                </div>

                {s.specializations?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.specializations.slice(0, 3).map((sp: string) => (
                      <span key={sp} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{sp}</span>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t border-border grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="font-bold">{s.month_appointments}</div>
                    <div className="text-muted-foreground">Services</div>
                  </div>
                  <div>
                    <div className="font-bold">{formatCurrency(s.month_revenue)}</div>
                    <div className="text-muted-foreground">Revenue</div>
                  </div>
                  <div>
                    <div className="font-bold">{formatCurrency(s.month_commission)}</div>
                    <div className="text-muted-foreground">Commission</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="text-xs text-muted-foreground flex gap-0.5">
                    {DAYS.map((d, i) => (
                      <span key={d} className={cn('w-5 h-5 rounded text-center leading-5',
                        s.working_days?.includes(i) ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground/40')}>
                        {d[0]}
                      </span>
                    ))}
                  </div>
                </div>

                {canManage && (
                  <button onClick={() => {
                    setShowAttendanceModal(s)
                    setAttendanceForm({ status: s.today_status ?? 'present', check_in: '', check_out: '', notes: '' })
                  }}
                    className="w-full py-1.5 rounded-xl border border-border text-xs font-medium hover:bg-muted/40 flex items-center justify-center gap-1.5">
                    <Clock className="w-3 h-3" />Mark Attendance
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'attendance' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr><th>Staff</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Commission</th>{canManage && <th></th>}</tr>
            </thead>
            <tbody>
              {staffList.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={s.full_name} size="xs" />
                      <div>
                        <div className="text-sm font-medium">{s.full_name}</div>
                        <div className="text-xs text-muted-foreground">{s.designation}</div>
                      </div>
                    </div>
                  </td>
                  <td>{getAttendanceBadge(s.today_status)}</td>
                  <td className="text-sm text-muted-foreground">
                    {s.check_in ? format(new Date(s.check_in), 'h:mm a') : '—'}
                  </td>
                  <td className="text-sm text-muted-foreground">
                    {s.check_out ? format(new Date(s.check_out), 'h:mm a') : '—'}
                  </td>
                  <td className="text-sm font-medium">{formatCurrency(s.month_commission)}</td>
                  {canManage && (
                    <td>
                      <button onClick={() => {
                        setShowAttendanceModal(s)
                        setAttendanceForm({ status: s.today_status ?? 'present', check_in: '', check_out: '', notes: '' })
                      }}
                        className="text-xs text-primary hover:underline">Edit</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAttendanceModal(null)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="font-semibold">Mark Attendance</h3>
              <p className="text-sm text-muted-foreground">{showAttendanceModal.full_name} · {format(new Date(), 'dd MMM yyyy')}</p>
            </div>
            <form onSubmit={handleMarkAttendance} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(['present', 'absent', 'half_day', 'leave'] as const).map(s => (
                  <button key={s} type="button" onClick={() => setAttendanceForm(f => ({ ...f, status: s }))}
                    className={cn('py-2 rounded-xl border text-sm font-medium capitalize transition-colors',
                      attendanceForm.status === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40')}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Check In</label>
                  <input type="time" value={attendanceForm.check_in} onChange={e => setAttendanceForm(f => ({ ...f, check_in: e.target.value }))}
                    className="w-full h-9 px-2 rounded-xl border border-border bg-background text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Check Out</label>
                  <input type="time" value={attendanceForm.check_out} onChange={e => setAttendanceForm(f => ({ ...f, check_out: e.target.value }))}
                    className="w-full h-9 px-2 rounded-xl border border-border bg-background text-sm focus:outline-none" />
                </div>
              </div>
              <input type="text" value={attendanceForm.notes} onChange={e => setAttendanceForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes (optional)"
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAttendanceModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2">
                  {submitting && <Spinner className="w-4 h-4" />}Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add Staff Member</h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleAddStaff} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Full Name *</label>
                  <input type="text" value={addForm.full_name} onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))} required
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Phone *</label>
                  <input type="tel" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} required
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Designation</label>
                  <input type="text" value={addForm.designation} onChange={e => setAddForm(f => ({ ...f, designation: e.target.value }))}
                    placeholder="e.g. Senior Stylist"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Commission Type</label>
                  <select value={addForm.commission_type} onChange={e => setAddForm(f => ({ ...f, commission_type: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed per service (₹)</option>
                    <option value="none">No commission</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Commission {addForm.commission_type === 'percentage' ? '%' : '₹'}
                  </label>
                  <input type="number" value={addForm.commission_value} onChange={e => setAddForm(f => ({ ...f, commission_value: e.target.value }))}
                    min="0" max={addForm.commission_type === 'percentage' ? '100' : undefined}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Work Start</label>
                  <input type="time" value={addForm.working_hours_start} onChange={e => setAddForm(f => ({ ...f, working_hours_start: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Work End</label>
                  <input type="time" value={addForm.working_hours_end} onChange={e => setAddForm(f => ({ ...f, working_hours_end: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Working Days</label>
                  <div className="flex gap-1.5">
                    {DAYS.map((day, i) => (
                      <button key={day} type="button"
                        onClick={() => setAddForm(f => ({
                          ...f,
                          working_days: f.working_days.includes(i)
                            ? f.working_days.filter(d => d !== i)
                            : [...f.working_days, i]
                        }))}
                        className={cn('flex-1 py-1.5 text-xs rounded-lg border transition-colors font-medium',
                          addForm.working_days.includes(i) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40')}>
                        {day[0]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Specializations (comma-separated)</label>
                  <input type="text" value={addForm.specializations} onChange={e => setAddForm(f => ({ ...f, specializations: e.target.value }))}
                    placeholder="Hair Color, Keratin, Bridal Makeup…"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2">
                  {submitting && <Spinner className="w-4 h-4" />}Add Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
