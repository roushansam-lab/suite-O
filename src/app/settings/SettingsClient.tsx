'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Plus, Scissors, Tag, Crown, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, cn } from '@/lib/utils'
import { Badge, Card, Spinner, SectionHeader } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

const TABS = [
  { id: 'salon',    label: 'Salon Profile',  icon: Settings2 },
  { id: 'services', label: 'Services',        icon: Scissors },
  { id: 'offers',   label: 'Coupons',         icon: Tag },
  { id: 'plans',    label: 'Memberships',     icon: Crown },
]

interface Props {
  salon: any
  services: any[]
  categories: any[]
  membershipPlans: any[]
  coupons: any[]
  userRole: string
  userId: string
}

export default function SettingsClient({ salon, services, categories, membershipPlans, coupons, userRole }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [tab, setTab] = useState('salon')
  const [saving, setSaving] = useState(false)

  // Salon form
  const [salonForm, setSalonForm] = useState({
    name: salon?.name ?? '',
    phone: salon?.phone ?? '',
    email: salon?.email ?? '',
    address: salon?.address ?? '',
    city: salon?.city ?? '',
    state: salon?.state ?? '',
    pincode: salon?.pincode ?? '',
    gst_number: salon?.gst_number ?? '',
    booking_buffer_minutes: salon?.booking_buffer_minutes ?? 10,
    auto_confirm_bookings: salon?.auto_confirm_bookings ?? false,
    max_advance_booking_days: salon?.max_advance_booking_days ?? 30,
  })

  // Service form
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [serviceForm, setServiceForm] = useState({
    name: '', category_id: '', duration_minutes: '30',
    base_price: '', gst_rate: '18', description: '',
  })

  // Coupon form
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [couponForm, setCouponForm] = useState({
    code: '', description: '', discount_type: 'percentage',
    discount_value: '', min_order_value: '', valid_until: '',
  })

  async function saveSalon(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('salons').update({
      name: salonForm.name,
      phone: salonForm.phone,
      email: salonForm.email || null,
      address: salonForm.address || null,
      city: salonForm.city,
      state: salonForm.state,
      pincode: salonForm.pincode || null,
      gst_number: salonForm.gst_number || null,
      booking_buffer_minutes: Number(salonForm.booking_buffer_minutes),
      auto_confirm_bookings: salonForm.auto_confirm_bookings,
      max_advance_booking_days: Number(salonForm.max_advance_booking_days),
    }).eq('id', salon.id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Salon settings saved!')
    startTransition(() => router.refresh())
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault()
    if (!serviceForm.name || !serviceForm.base_price) { toast.error('Name and price required'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('services').insert({
      salon_id: salon.id,
      name: serviceForm.name,
      category_id: serviceForm.category_id || null,
      duration_minutes: Number(serviceForm.duration_minutes),
      base_price: Number(serviceForm.base_price),
      gst_rate: Number(serviceForm.gst_rate),
      description: serviceForm.description || null,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Service added!')
    setShowServiceForm(false)
    setServiceForm({ name: '', category_id: '', duration_minutes: '30', base_price: '', gst_rate: '18', description: '' })
    startTransition(() => router.refresh())
  }

  async function toggleServiceActive(id: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('services').update({ is_active: !current }).eq('id', id)
    startTransition(() => router.refresh())
  }

  async function addCoupon(e: React.FormEvent) {
    e.preventDefault()
    if (!couponForm.code || !couponForm.discount_value) { toast.error('Code and discount value required'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('coupons').insert({
      salon_id: salon.id,
      code: couponForm.code.toUpperCase(),
      description: couponForm.description || null,
      discount_type: couponForm.discount_type,
      discount_value: Number(couponForm.discount_value),
      min_order_value: couponForm.min_order_value ? Number(couponForm.min_order_value) : null,
      valid_until: couponForm.valid_until || null,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Coupon created!')
    setShowCouponForm(false)
    setCouponForm({ code: '', description: '', discount_type: 'percentage', discount_value: '', min_order_value: '', valid_until: '' })
    startTransition(() => router.refresh())
  }

  const isAdmin = ['admin', 'super_admin', 'manager'].includes(userRole)

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === t.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* ── SALON PROFILE ── */}
      {tab === 'salon' && (
        <Card>
          <form onSubmit={saveSalon} className="p-6 space-y-5">
            <SectionHeader title="Salon Profile" description="Basic salon information displayed on invoices and communications" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { field: 'name',     label: 'Salon Name *', type: 'text' },
                { field: 'phone',    label: 'Phone *',      type: 'tel' },
                { field: 'email',    label: 'Email',        type: 'email' },
                { field: 'gst_number', label: 'GST Number', type: 'text' },
                { field: 'address',  label: 'Address',      type: 'text' },
                { field: 'city',     label: 'City',         type: 'text' },
                { field: 'state',    label: 'State',        type: 'text' },
                { field: 'pincode',  label: 'PIN Code',     type: 'text' },
              ].map(({ field, label, type }) => (
                <div key={field} className={field === 'address' ? 'sm:col-span-2' : ''}>
                  <label className="text-sm font-medium mb-1.5 block">{label}</label>
                  <input type={type} value={(salonForm as any)[field]}
                    onChange={e => setSalonForm(f => ({ ...f, [field]: e.target.value }))}
                    disabled={!isAdmin}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-5">
              <h4 className="text-sm font-semibold mb-4">Booking Settings</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Buffer Between Bookings (min)</label>
                  <input type="number" value={salonForm.booking_buffer_minutes} min="0" max="60"
                    onChange={e => setSalonForm(f => ({ ...f, booking_buffer_minutes: Number(e.target.value) }))}
                    disabled={!isAdmin}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Max Advance Booking (days)</label>
                  <input type="number" value={salonForm.max_advance_booking_days} min="1" max="365"
                    onChange={e => setSalonForm(f => ({ ...f, max_advance_booking_days: Number(e.target.value) }))}
                    disabled={!isAdmin}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={salonForm.auto_confirm_bookings}
                      onChange={e => setSalonForm(f => ({ ...f, auto_confirm_bookings: e.target.checked }))}
                      disabled={!isAdmin}
                      className="w-4 h-4 rounded border-border accent-primary" />
                    <span className="text-sm font-medium">Auto-confirm bookings</span>
                  </label>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-end">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  {saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </Card>
      )}

      {/* ── SERVICES ── */}
      {tab === 'services' && (
        <div className="space-y-4">
          <SectionHeader title="Services & Pricing" description="Manage all services offered at your salon"
            action={isAdmin && (
              <button onClick={() => setShowServiceForm(!showServiceForm)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90">
                <Plus className="w-4 h-4" />Add Service
              </button>
            )} />

          {showServiceForm && (
            <Card>
              <form onSubmit={addService} className="p-5 space-y-4">
                <h4 className="font-semibold text-sm">New Service</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-1.5 block">Service Name *</label>
                    <input type="text" value={serviceForm.name} onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))} required
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Category</label>
                    <select value={serviceForm.category_id} onChange={e => setServiceForm(f => ({ ...f, category_id: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">No category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Duration (min) *</label>
                    <input type="number" value={serviceForm.duration_minutes} onChange={e => setServiceForm(f => ({ ...f, duration_minutes: e.target.value }))} min="5" required
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Base Price (₹) *</label>
                    <input type="number" value={serviceForm.base_price} onChange={e => setServiceForm(f => ({ ...f, base_price: e.target.value }))} min="0" required
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">GST Rate (%)</label>
                    <select value={serviceForm.gst_rate} onChange={e => setServiceForm(f => ({ ...f, gst_rate: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      {['0', '5', '12', '18', '28'].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-1.5 block">Description</label>
                    <textarea value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowServiceForm(false)}
                    className="flex-1 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted/40">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2">
                    {saving && <Spinner className="w-4 h-4" />}Add Service
                  </button>
                </div>
              </form>
            </Card>
          )}

          <Card>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Service</th><th>Category</th><th>Duration</th><th className="text-right">Price</th><th>GST</th><th>Status</th>{isAdmin && <th></th>}</tr></thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="font-medium text-sm">{s.name}</div>
                        {s.description && <div className="text-xs text-muted-foreground truncate max-w-48">{s.description}</div>}
                      </td>
                      <td>
                        {s.category ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.category.color + '20', color: s.category.color }}>{s.category.name}</span>
                        ) : '—'}
                      </td>
                      <td className="text-sm text-muted-foreground">{s.duration_minutes} min</td>
                      <td className="text-right font-semibold text-sm">{formatCurrency(s.base_price)}</td>
                      <td className="text-sm text-muted-foreground">{s.gst_rate}%</td>
                      <td><Badge variant={s.is_active ? 'success' : 'outline'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></td>
                      {isAdmin && (
                        <td>
                          <button onClick={() => toggleServiceActive(s.id, s.is_active)}
                            className="text-xs text-primary hover:underline">{s.is_active ? 'Deactivate' : 'Activate'}</button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {services.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted-foreground py-8 text-sm">No services added yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── COUPONS ── */}
      {tab === 'offers' && (
        <div className="space-y-4">
          <SectionHeader title="Coupons & Discounts" description="Create promotional discount codes"
            action={isAdmin && (
              <button onClick={() => setShowCouponForm(!showCouponForm)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90">
                <Plus className="w-4 h-4" />Add Coupon
              </button>
            )} />

          {showCouponForm && (
            <Card>
              <form onSubmit={addCoupon} className="p-5 space-y-3">
                <h4 className="font-semibold text-sm">New Coupon</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Code *</label>
                    <input type="text" value={couponForm.code} onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required
                      placeholder="e.g. DIWALI20"
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Type *</label>
                    <select value={couponForm.discount_type} onChange={e => setCouponForm(f => ({ ...f, discount_type: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="percentage">Percentage (%) off</option>
                      <option value="fixed">Fixed (₹) off</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Value *</label>
                    <input type="number" value={couponForm.discount_value} onChange={e => setCouponForm(f => ({ ...f, discount_value: e.target.value }))} required min="1"
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Min Order (₹)</label>
                    <input type="number" value={couponForm.min_order_value} onChange={e => setCouponForm(f => ({ ...f, min_order_value: e.target.value }))} min="0"
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Valid Until</label>
                    <input type="date" value={couponForm.valid_until} onChange={e => setCouponForm(f => ({ ...f, valid_until: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Description</label>
                    <input type="text" value={couponForm.description} onChange={e => setCouponForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Optional note"
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowCouponForm(false)}
                    className="flex-1 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted/40">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2">
                    {saving && <Spinner className="w-4 h-4" />}Create Coupon
                  </button>
                </div>
              </form>
            </Card>
          )}

          <Card>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Code</th><th>Discount</th><th>Min Order</th><th>Valid Until</th><th>Used</th><th>Status</th></tr></thead>
                <tbody>
                  {coupons.map((c: any) => (
                    <tr key={c.id}>
                      <td><code className="text-sm font-bold bg-muted px-1.5 py-0.5 rounded">{c.code}</code></td>
                      <td className="text-sm font-medium">
                        {c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                      </td>
                      <td className="text-sm text-muted-foreground">{c.min_order_value ? `₹${c.min_order_value}` : 'None'}</td>
                      <td className="text-sm text-muted-foreground">{c.valid_until ?? '—'}</td>
                      <td className="text-sm">{c.used_count} times</td>
                      <td><Badge variant={c.is_active ? 'success' : 'outline'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    </tr>
                  ))}
                  {coupons.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-muted-foreground py-8 text-sm">No coupons yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── MEMBERSHIPS ── */}
      {tab === 'plans' && (
        <div className="space-y-4">
          <SectionHeader title="Membership Plans" description="Subscription packages for loyal customers" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {membershipPlans.map((plan: any) => (
              <div key={plan.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
                <div>
                  <div className="font-semibold">{plan.name}</div>
                  <div className="text-2xl font-bold mt-1">{formatCurrency(plan.price)}</div>
                  <div className="text-xs text-muted-foreground">Valid for {plan.validity_days} days</div>
                </div>
                <div className="space-y-1.5">
                  {plan.benefits?.map((b: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-green-500">✓</span>
                      <span>{b.label}</span>
                    </div>
                  ))}
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            ))}
            {membershipPlans.length === 0 && (
              <div className="sm:col-span-3 text-center py-10 text-muted-foreground text-sm">
                No membership plans configured yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
