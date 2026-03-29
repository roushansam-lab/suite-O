'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, UserPlus, Phone, Mail, Star, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { formatCurrency, cn } from '@/lib/utils'
import { Avatar, Badge, EmptyState, Spinner } from '@/components/ui'
import { customerApi } from '@/lib/api'
import type { Customer } from '@/types'

interface Props {
  salonId: string
  customers: Customer[]
  total: number
  page: number
  perPage: number
  search: string
}

export default function CustomersClient({ salonId, customers, total, page, perPage, search }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState(search)
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', gender: '',
    date_of_birth: '', skin_type: '', hair_type: '',
    allergies: '', notes: '', tags: '',
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    startTransition(() => {
      router.push(`/customers?q=${encodeURIComponent(searchQuery)}`)
    })
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name || !form.phone) {
      toast.error('Name and phone are required')
      return
    }
    setSubmitting(true)
    const { data, error } = await customerApi.create(salonId, {
      full_name: form.full_name,
      phone: form.phone,
      email: form.email || undefined,
      gender: form.gender as any || undefined,
      date_of_birth: form.date_of_birth || undefined,
      skin_type: form.skin_type || undefined,
      hair_type: form.hair_type || undefined,
      allergies: form.allergies || undefined,
      notes: form.notes || undefined,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
    })
    setSubmitting(false)
    if (error) { toast.error(error); return }
    toast.success('Customer added successfully!')
    setShowAddModal(false)
    setForm({ full_name: '', phone: '', email: '', gender: '', date_of_birth: '', skin_type: '', hair_type: '', allergies: '', notes: '', tags: '' })
    startTransition(() => router.refresh())
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, email…"
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button type="submit" className="px-4 h-10 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80">
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{total} customers</span>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Customer Grid */}
      {customers.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="w-8 h-8" />}
          title={search ? 'No customers found' : 'No customers yet'}
          description={search ? `No results for "${search}"` : 'Start adding customers to build your CRM'}
          action={
            !search && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
              >
                Add First Customer
              </button>
            )
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {customers.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={c.full_name} src={c.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold group-hover:text-primary transition-colors truncate">
                      {c.full_name}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />{c.phone}
                    </div>
                    {c.email && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <Mail className="w-3 h-3" />{c.email}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="font-bold text-sm">{c.total_visits}</div>
                    <div className="text-muted-foreground">Visits</div>
                  </div>
                  <div>
                    <div className="font-bold text-sm">{formatCurrency(c.total_spent)}</div>
                    <div className="text-muted-foreground">Spent</div>
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center justify-center gap-0.5">
                      <Star className="w-3 h-3 text-amber-500" />
                      {c.loyalty_points}
                    </div>
                    <div className="text-muted-foreground">Points</div>
                  </div>
                </div>

                {c.tags && c.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{tag}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => router.push(`/customers?q=${search}&page=${page - 1}`)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted/40 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <button
                onClick={() => router.push(`/customers?q=${search}&page=${page + 1}`)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted/40 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add New Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Full Name *</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    required placeholder="e.g. Priya Sharma"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Phone *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    required placeholder="+91 98765 00000"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="optional"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Gender</label>
                  <select
                    value={form.gender}
                    onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select…</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Date of Birth</label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Skin Type</label>
                  <select
                    value={form.skin_type}
                    onChange={e => setForm(f => ({ ...f, skin_type: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select…</option>
                    {['Normal', 'Oily', 'Dry', 'Combination', 'Sensitive'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Hair Type</label>
                  <select
                    value={form.hair_type}
                    onChange={e => setForm(f => ({ ...f, hair_type: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select…</option>
                    {['Straight', 'Wavy', 'Curly', 'Coily', 'Fine', 'Thick'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Allergies / Sensitivities</label>
                  <input
                    type="text"
                    value={form.allergies}
                    onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))}
                    placeholder="e.g. Ammonia dyes, latex gloves…"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="VIP, Regular, Bridal…"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    placeholder="Any preferences or special notes…"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting && <Spinner className="w-4 h-4" />}
                  Add Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
