'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Package, AlertTriangle, Plus, Search, ArrowUp, ArrowDown, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { formatCurrency, cn } from '@/lib/utils'
import { Badge, EmptyState, Card, Spinner, StatCard } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

interface Props {
  salonId: string
  userId: string
  products: any[]
  suppliers: any[]
  recentTransactions: any[]
  lowStockCount: number
  expiringCount: number
}

export default function InventoryClient({ salonId, userId, products, suppliers, recentTransactions, lowStockCount, expiringCount }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [tab, setTab] = useState<'products' | 'transactions' | 'suppliers'>('products')
  const [search, setSearch] = useState('')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState<any | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [productForm, setProductForm] = useState({
    name: '', sku: '', category: '', unit: 'piece',
    current_stock: '', minimum_stock: '5', maximum_stock: '',
    cost_price: '', selling_price: '', expiry_date: '',
    supplier_id: '', is_retail: false,
  })
  const [adjustForm, setAdjustForm] = useState({
    type: 'purchase' as 'purchase' | 'adjustment' | 'return' | 'expired',
    quantity: '', unit_cost: '', notes: '',
  })

  const filteredProducts = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  )

  function getStockStatus(product: any) {
    const stock = Number(product.current_stock)
    const min = Number(product.minimum_stock)
    if (stock === 0) return { label: 'Out of stock', variant: 'danger' as const }
    if (stock <= min) return { label: 'Low stock', variant: 'warning' as const }
    return { label: 'In stock', variant: 'success' as const }
  }

  function isExpiringSoon(product: any) {
    if (!product.expiry_date) return false
    const expiry = new Date(product.expiry_date)
    const warning = new Date()
    warning.setDate(warning.getDate() + 30)
    return expiry <= warning
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!productForm.name) { toast.error('Product name is required'); return }
    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.from('inventory_products').insert({
      salon_id: salonId,
      name: productForm.name,
      sku: productForm.sku || null,
      category: productForm.category || null,
      unit: productForm.unit,
      current_stock: Number(productForm.current_stock) || 0,
      minimum_stock: Number(productForm.minimum_stock) || 5,
      maximum_stock: productForm.maximum_stock ? Number(productForm.maximum_stock) : null,
      cost_price: productForm.cost_price ? Number(productForm.cost_price) : null,
      selling_price: productForm.selling_price ? Number(productForm.selling_price) : null,
      expiry_date: productForm.expiry_date || null,
      supplier_id: productForm.supplier_id || null,
      is_retail: productForm.is_retail,
    })
    setSubmitting(false)
    if (error) { toast.error(error.message); return }
    toast.success('Product added!')
    setShowAddProduct(false)
    startTransition(() => router.refresh())
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    if (!adjustForm.quantity) { toast.error('Quantity required'); return }
    setSubmitting(true)
    const supabase = createClient()
    const qty = Number(adjustForm.quantity)
    const delta = ['purchase', 'return'].includes(adjustForm.type) ? qty : -qty

    // Insert transaction
    await supabase.from('inventory_transactions').insert({
      salon_id: salonId,
      product_id: showAdjustModal.id,
      type: adjustForm.type,
      quantity: qty,
      unit_cost: adjustForm.unit_cost ? Number(adjustForm.unit_cost) : null,
      total_cost: adjustForm.unit_cost ? Number(adjustForm.unit_cost) * qty : null,
      notes: adjustForm.notes || null,
      created_by: userId,
    })

    // Update stock
    await supabase.from('inventory_products').update({
      current_stock: Math.max(0, showAdjustModal.current_stock + delta)
    }).eq('id', showAdjustModal.id)

    setSubmitting(false)
    toast.success('Stock updated!')
    setShowAdjustModal(null)
    setAdjustForm({ type: 'purchase', quantity: '', unit_cost: '', notes: '' })
    startTransition(() => router.refresh())
  }

  const TABS = [
    { id: 'products', label: `Products (${products.length})` },
    { id: 'transactions', label: 'Transactions' },
    { id: 'suppliers', label: `Suppliers (${suppliers.length})` },
  ]

  return (
    <div className="space-y-5">
      {/* Alert stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Products" value={products.length} icon={<Package className="w-5 h-5 text-primary" />} iconBg="bg-primary/10" />
        <StatCard title="Low Stock" value={lowStockCount} icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} iconBg="bg-amber-50 dark:bg-amber-900/20" changeType={lowStockCount > 0 ? 'negative' : 'positive'} change={lowStockCount > 0 ? 'Needs attention' : 'All good'} />
        <StatCard title="Expiring Soon" value={expiringCount} icon={<Calendar className="w-5 h-5 text-red-500" />} iconBg="bg-red-50 dark:bg-red-900/20" changeType={expiringCount > 0 ? 'negative' : 'positive'} change={expiringCount > 0 ? 'Within 30 days' : 'None expiring'} />
        <StatCard title="Suppliers" value={suppliers.length} icon={<Package className="w-5 h-5 text-blue-500" />} iconBg="bg-blue-50 dark:bg-blue-900/20" />
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-muted/40 rounded-xl">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tab === t.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'products' && (
          <button onClick={() => setShowAddProduct(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" />Add Product
          </button>
        )}
      </div>

      {tab === 'products' && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <Card>
            {filteredProducts.length === 0 ? (
              <EmptyState icon={<Package className="w-8 h-8" />} title="No products" description="Add your first product to start tracking inventory" />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Supplier</th>
                      <th className="text-right">Stock</th>
                      <th className="text-right">Min</th>
                      <th>Expiry</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => {
                      const status = getStockStatus(p)
                      const expiring = isExpiringSoon(p)
                      return (
                        <tr key={p.id}>
                          <td>
                            <div>
                              <div className="font-medium text-sm">{p.name}</div>
                              {p.sku && <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>}
                            </div>
                          </td>
                          <td className="text-sm text-muted-foreground">{p.category ?? '—'}</td>
                          <td className="text-sm text-muted-foreground">{p.supplier?.name ?? '—'}</td>
                          <td className="text-right">
                            <span className={cn('font-semibold text-sm', Number(p.current_stock) <= Number(p.minimum_stock) && 'text-red-500')}>
                              {p.current_stock} {p.unit}
                            </span>
                          </td>
                          <td className="text-right text-sm text-muted-foreground">{p.minimum_stock} {p.unit}</td>
                          <td>
                            {p.expiry_date ? (
                              <span className={cn('text-xs', expiring && 'text-red-500 font-medium')}>
                                {expiring && '⚠ '}
                                {format(new Date(p.expiry_date), 'dd MMM yyyy')}
                              </span>
                            ) : '—'}
                          </td>
                          <td><Badge variant={status.variant}>{status.label}</Badge></td>
                          <td>
                            <button onClick={() => setShowAdjustModal(p)}
                              className="text-xs text-primary hover:underline">Adjust</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {tab === 'transactions' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Product</th><th>Type</th><th className="text-right">Qty</th><th>Date</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {recentTransactions.map((t: any) => (
                  <tr key={t.id}>
                    <td className="font-medium text-sm">{t.product?.name}</td>
                    <td>
                      <Badge variant={['purchase', 'return'].includes(t.type) ? 'success' : 'warning'} className="capitalize">{t.type}</Badge>
                    </td>
                    <td className="text-right">
                      <span className={cn('font-semibold text-sm flex items-center justify-end gap-1',
                        ['purchase', 'return'].includes(t.type) ? 'text-green-600' : 'text-red-500')}>
                        {['purchase', 'return'].includes(t.type) ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {t.quantity} {t.product?.unit}
                      </span>
                    </td>
                    <td className="text-sm text-muted-foreground">{format(new Date(t.created_at), 'dd MMM, h:mm a')}</td>
                    <td className="text-sm text-muted-foreground">{t.notes ?? '—'}</td>
                  </tr>
                ))}
                {recentTransactions.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted-foreground py-6 text-sm">No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'suppliers' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Email</th><th>GST</th></tr></thead>
              <tbody>
                {suppliers.map((s: any) => (
                  <tr key={s.id}>
                    <td className="font-medium text-sm">{s.name}</td>
                    <td className="text-sm text-muted-foreground">{s.contact_name ?? '—'}</td>
                    <td className="text-sm text-muted-foreground">{s.phone ?? '—'}</td>
                    <td className="text-sm text-muted-foreground">{s.email ?? '—'}</td>
                    <td className="text-xs font-mono text-muted-foreground">{s.gst_number ?? '—'}</td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted-foreground py-6 text-sm">No suppliers added</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Stock Adjust Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAdjustModal(null)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold">Adjust Stock — {showAdjustModal.name}</h3>
            <p className="text-sm text-muted-foreground">Current: <strong>{showAdjustModal.current_stock} {showAdjustModal.unit}</strong></p>
            <form onSubmit={handleAdjust} className="space-y-3">
              <select value={adjustForm.type} onChange={e => setAdjustForm(f => ({ ...f, type: e.target.value as any }))}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none">
                <option value="purchase">Purchase (add stock)</option>
                <option value="adjustment">Adjustment (reduce)</option>
                <option value="return">Return (add back)</option>
                <option value="expired">Expired / Waste (remove)</option>
              </select>
              <input type="number" value={adjustForm.quantity} onChange={e => setAdjustForm(f => ({ ...f, quantity: e.target.value }))}
                required min="0.01" step="0.01" placeholder="Quantity *"
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none" />
              {adjustForm.type === 'purchase' && (
                <input type="number" value={adjustForm.unit_cost} onChange={e => setAdjustForm(f => ({ ...f, unit_cost: e.target.value }))}
                  min="0" step="0.01" placeholder="Unit cost (optional)"
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none" />
              )}
              <input type="text" value={adjustForm.notes} onChange={e => setAdjustForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes (optional)"
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAdjustModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting && <Spinner className="w-4 h-4" />}Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddProduct(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Add Product</h3>
              <button onClick={() => setShowAddProduct(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleAddProduct} className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Product Name *</label>
                  <input type="text" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
                    required className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                {[
                  { field: 'sku', label: 'SKU / Code', type: 'text' },
                  { field: 'category', label: 'Category', type: 'text' },
                  { field: 'current_stock', label: 'Opening Stock', type: 'number' },
                  { field: 'minimum_stock', label: 'Min. Stock Alert', type: 'number' },
                  { field: 'cost_price', label: 'Cost Price (₹)', type: 'number' },
                  { field: 'selling_price', label: 'Selling Price (₹)', type: 'number' },
                  { field: 'expiry_date', label: 'Expiry Date', type: 'date' },
                ].map(({ field, label, type }) => (
                  <div key={field}>
                    <label className="text-sm font-medium mb-1.5 block">{label}</label>
                    <input type={type} value={(productForm as any)[field]}
                      onChange={e => setProductForm(f => ({ ...f, [field]: e.target.value }))}
                      step={type === 'number' ? '0.01' : undefined}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                ))}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Unit</label>
                  <select value={productForm.unit} onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {['piece', 'ml', 'gm', 'kg', 'litre', 'bottle', 'tube', 'box', 'pack'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Supplier</label>
                  <select value={productForm.supplier_id} onChange={e => setProductForm(f => ({ ...f, supplier_id: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">None</option>
                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={productForm.is_retail}
                  onChange={e => setProductForm(f => ({ ...f, is_retail: e.target.checked }))}
                  className="rounded border-border" />
                Retail product (can be sold to customers)
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddProduct(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting && <Spinner className="w-4 h-4" />}Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
