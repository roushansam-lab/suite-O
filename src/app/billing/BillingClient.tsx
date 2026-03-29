'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Receipt, IndianRupee, Search, Download, Printer, X, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { formatCurrency, calculateGST, calculateLoyaltyPoints, cn } from '@/lib/utils'
import { Avatar, Badge, PaymentStatusBadge, Spinner, EmptyState, Card } from '@/components/ui'
import { billingApi } from '@/lib/api'

interface LineItem {
  service_id: string
  name: string
  quantity: number
  unit_price: number
  gst_rate: number
  gst_amount: number
  discount: number
  total: number
}

interface Props {
  salonId: string
  userId: string
  invoices: any[]
  customers: any[]
  services: any[]
  salon: any
  activeTab: string
}

export default function BillingClient({ salonId, userId, invoices, customers, services, salon, activeTab }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [tab, setTab] = useState(activeTab)
  const [showPOS, setShowPOS] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchInvoice, setSearchInvoice] = useState('')

  // POS state
  const [posForm, setPosForm] = useState({
    customer_id: '',
    payment_method: 'cash' as const,
    discount_type: '' as '' | 'percentage' | 'fixed',
    discount_value: 0,
    coupon_code: '',
    loyalty_to_use: 0,
    notes: '',
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  function addService(service: any) {
    const existing = lineItems.find(li => li.service_id === service.id)
    if (existing) {
      setLineItems(items => items.map(li =>
        li.service_id === service.id
          ? { ...li, quantity: li.quantity + 1, total: (li.quantity + 1) * (li.unit_price + li.gst_amount / li.quantity) }
          : li
      ))
      return
    }
    const gst = calculateGST(service.base_price, service.gst_rate, service.is_gst_inclusive)
    setLineItems(items => [...items, {
      service_id: service.id,
      name: service.name,
      quantity: 1,
      unit_price: gst.baseAmount,
      gst_rate: service.gst_rate,
      gst_amount: gst.totalTax,
      discount: 0,
      total: gst.grandTotal,
    }])
  }

  function removeItem(serviceId: string) {
    setLineItems(items => items.filter(li => li.service_id !== serviceId))
  }

  function updateQuantity(serviceId: string, qty: number) {
    if (qty <= 0) { removeItem(serviceId); return }
    setLineItems(items => items.map(li => {
      if (li.service_id !== serviceId) return li
      const newGst = li.gst_amount / li.quantity * qty
      return { ...li, quantity: qty, gst_amount: newGst, total: (li.unit_price * qty) + newGst }
    }))
  }

  // Computed totals
  const subtotal     = lineItems.reduce((s, li) => s + li.unit_price * li.quantity, 0)
  const totalGST     = lineItems.reduce((s, li) => s + li.gst_amount, 0)
  const discountAmt  = posForm.discount_type === 'percentage'
    ? subtotal * (posForm.discount_value / 100)
    : posForm.discount_value
  const loyaltyDisc  = posForm.loyalty_to_use * 0.5
  const grandTotal   = Math.max(0, subtotal + totalGST - discountAmt - loyaltyDisc)
  const pointsEarned = calculateLoyaltyPoints(grandTotal)

  const selectedCustomer = customers.find(c => c.id === posForm.customer_id)

  async function handleCheckout() {
    if (!posForm.customer_id) { toast.error('Please select a customer'); return }
    if (lineItems.length === 0) { toast.error('Add at least one service'); return }
    setSubmitting(true)
    const { data, error } = await billingApi.createInvoice(salonId, userId, {
      customer_id: posForm.customer_id,
      line_items: lineItems,
      discount_type: posForm.discount_type || undefined,
      discount_value: posForm.discount_value || undefined,
      coupon_code: posForm.coupon_code || undefined,
      loyalty_points_to_use: posForm.loyalty_to_use || undefined,
      payment_method: posForm.payment_method,
      notes: posForm.notes || undefined,
    })
    setSubmitting(false)
    if (error) { toast.error(error); return }
    toast.success(`Invoice #${data?.invoice_number} created! ₹${grandTotal.toFixed(0)} collected.`)
    setShowPOS(false)
    setLineItems([])
    setPosForm({ customer_id: '', payment_method: 'cash', discount_type: '', discount_value: 0, coupon_code: '', loyalty_to_use: 0, notes: '' })
    startTransition(() => router.refresh())
  }

  const filteredInvoices = invoices.filter(inv =>
    !searchInvoice ||
    inv.invoice_number?.toLowerCase().includes(searchInvoice.toLowerCase()) ||
    inv.customer?.full_name?.toLowerCase().includes(searchInvoice.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Header tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-muted/40 rounded-xl">
          {['invoices', 'analytics'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors',
                tab === t ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'invoices' ? 'Invoices' : 'Analytics'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowPOS(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      {tab === 'invoices' && (
        <>
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search" value={searchInvoice}
              onChange={e => setSearchInvoice(e.target.value)}
              placeholder="Search invoices…"
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Invoice table */}
          <Card>
            {filteredInvoices.length === 0 ? (
              <EmptyState
                icon={<Receipt className="w-8 h-8" />}
                title="No invoices yet"
                description="Create your first invoice using the POS terminal"
                action={
                  <button onClick={() => setShowPOS(true)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
                    Open POS
                  </button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th className="text-right">Amount</th>
                      <th>Payment</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map(inv => (
                      <tr key={inv.id}>
                        <td className="font-mono text-sm font-medium">{inv.invoice_number}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Avatar name={inv.customer?.full_name ?? '?'} size="xs" />
                            <div>
                              <div className="text-sm font-medium">{inv.customer?.full_name}</div>
                              <div className="text-xs text-muted-foreground">{inv.customer?.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-sm text-muted-foreground">
                          {format(new Date(inv.created_at), 'dd MMM yyyy, h:mm a')}
                        </td>
                        <td className="text-right font-semibold text-sm">
                          {formatCurrency(inv.grand_total)}
                        </td>
                        <td>
                          {inv.payments?.[0] && (
                            <Badge variant="outline" className="capitalize text-xs">
                              {inv.payments[0].method.replace('_', ' ')}
                            </Badge>
                          )}
                        </td>
                        <td><PaymentStatusBadge status={inv.payment_status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {tab === 'analytics' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['Total Revenue', 'Total Invoices', 'Avg. Invoice Value'].map((title, i) => {
            const totalRev = invoices.filter(inv => inv.payment_status === 'paid').reduce((s, inv) => s + Number(inv.grand_total), 0)
            const values = [formatCurrency(totalRev), invoices.length.toString(), invoices.length > 0 ? formatCurrency(totalRev / invoices.length) : '₹0']
            return (
              <div key={title} className="stat-card">
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="text-2xl font-bold mt-1">{values[i]}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* POS Modal */}
      {showPOS && (
        <div className="fixed inset-0 z-50 flex items-stretch">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPOS(false)} />
          <div className="relative z-10 ml-auto flex h-full w-full max-w-3xl bg-card shadow-2xl flex-col">
            {/* POS Header */}
            <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-lg">Point of Sale</h3>
                <p className="text-xs text-muted-foreground">{salon?.name}</p>
              </div>
              <button onClick={() => setShowPOS(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left: Service picker */}
              <div className="flex-1 border-r border-border flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border flex-shrink-0">
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Services</p>
                  <div className="grid grid-cols-1 gap-1.5 overflow-y-auto max-h-96">
                    {services.map(s => (
                      <button
                        key={s.id}
                        onClick={() => addService(s)}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 text-left transition-all text-sm group"
                      >
                        <div>
                          <div className="font-medium group-hover:text-primary transition-colors">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.duration_minutes}min · {s.category?.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(s.base_price)}</div>
                          <div className="text-xs text-muted-foreground">+{s.gst_rate}% GST</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Cart & Payment */}
              <div className="w-80 flex flex-col overflow-hidden">
                {/* Cart items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Cart</p>

                  {lineItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Add services to begin
                    </div>
                  ) : (
                    lineItems.map(li => (
                      <div key={li.service_id} className="flex items-center gap-2 bg-muted/30 rounded-xl p-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{li.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(li.unit_price)} + GST {formatCurrency(li.gst_amount)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => updateQuantity(li.service_id, li.quantity - 1)}
                            className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-sm hover:bg-muted">–</button>
                          <span className="text-sm w-4 text-center">{li.quantity}</span>
                          <button onClick={() => updateQuantity(li.service_id, li.quantity + 1)}
                            className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-sm hover:bg-muted">+</button>
                        </div>
                        <button onClick={() => removeItem(li.service_id)} className="text-muted-foreground hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Payment section */}
                <div className="border-t border-border p-4 space-y-3 flex-shrink-0">
                  {/* Customer */}
                  <select
                    value={posForm.customer_id}
                    onChange={e => setPosForm(f => ({ ...f, customer_id: e.target.value }))}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select customer *</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>

                  {/* Payment method */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['cash', 'upi', 'card', 'split'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setPosForm(f => ({ ...f, payment_method: m }))}
                        className={cn(
                          'py-1.5 text-xs rounded-lg border capitalize transition-colors font-medium',
                          posForm.payment_method === m
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:border-primary/40'
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* Discount */}
                  <div className="flex gap-2">
                    <select
                      value={posForm.discount_type}
                      onChange={e => setPosForm(f => ({ ...f, discount_type: e.target.value as any }))}
                      className="flex-1 h-9 px-2 rounded-xl border border-border bg-background text-xs focus:outline-none"
                    >
                      <option value="">No discount</option>
                      <option value="percentage">% off</option>
                      <option value="fixed">₹ off</option>
                    </select>
                    {posForm.discount_type && (
                      <input
                        type="number"
                        value={posForm.discount_value}
                        onChange={e => setPosForm(f => ({ ...f, discount_value: Number(e.target.value) }))}
                        placeholder="Value"
                        min="0"
                        className="w-20 h-9 px-2 rounded-xl border border-border bg-background text-xs focus:outline-none"
                      />
                    )}
                  </div>

                  {/* Loyalty points */}
                  {selectedCustomer && selectedCustomer.loyalty_points > 0 && (
                    <div className="text-xs text-muted-foreground flex items-center justify-between bg-amber-50 dark:bg-amber-900/10 rounded-xl px-3 py-2">
                      <span>⭐ {selectedCustomer.loyalty_points} pts available</span>
                      <input
                        type="number"
                        value={posForm.loyalty_to_use}
                        onChange={e => setPosForm(f => ({ ...f, loyalty_to_use: Math.min(Number(e.target.value), selectedCustomer.loyalty_points) }))}
                        min="0" max={selectedCustomer.loyalty_points}
                        placeholder="Use pts"
                        className="w-20 h-7 px-2 rounded-lg border border-amber-200 bg-transparent text-xs"
                      />
                    </div>
                  )}

                  {/* Totals */}
                  <div className="bg-muted/30 rounded-xl p-3 space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>GST</span><span>{formatCurrency(totalGST)}</span></div>
                    {discountAmt > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(discountAmt)}</span></div>}
                    {loyaltyDisc > 0 && <div className="flex justify-between text-amber-600"><span>Loyalty</span><span>-{formatCurrency(loyaltyDisc)}</span></div>}
                    <div className="flex justify-between font-bold pt-1 border-t border-border">
                      <span>Total</span>
                      <span className="text-primary text-base">{formatCurrency(grandTotal)}</span>
                    </div>
                    {pointsEarned > 0 && (
                      <div className="text-xs text-amber-600 text-right">+{pointsEarned} loyalty points</div>
                    )}
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={submitting || lineItems.length === 0}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submitting && <Spinner className="w-4 h-4" />}
                    <IndianRupee className="w-4 h-4" />
                    Collect {formatCurrency(grandTotal)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
