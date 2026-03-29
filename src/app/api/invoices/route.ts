import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('salon_id').eq('id', user.id).single()
  if (!userData?.salon_id) return NextResponse.json({ error: 'No salon' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const status   = searchParams.get('status')
  const from     = searchParams.get('from')
  const to       = searchParams.get('to')
  const customer = searchParams.get('customer_id')
  const page     = parseInt(searchParams.get('page') ?? '1')
  const per_page = parseInt(searchParams.get('per_page') ?? '25')

  let query = supabase
    .from('invoices')
    .select('*, customer:customers(full_name, phone), payments(*)', { count: 'exact' })
    .eq('salon_id', userData.salon_id)
    .order('created_at', { ascending: false })
    .range((page - 1) * per_page, page * per_page - 1)

  if (status)   query = query.eq('payment_status', status)
  if (from)     query = query.gte('created_at', from)
  if (to)       query = query.lte('created_at', to)
  if (customer) query = query.eq('customer_id', customer)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, per_page })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('salon_id').eq('id', user.id).single()
  if (!userData?.salon_id) return NextResponse.json({ error: 'No salon' }, { status: 403 })

  const body = await request.json()
  const {
    customer_id, appointment_id, line_items,
    discount_type, discount_value = 0, coupon_code,
    loyalty_points_to_use = 0, payment_method, notes,
  } = body

  if (!customer_id || !line_items?.length || !payment_method) {
    return NextResponse.json({ error: 'customer_id, line_items and payment_method required' }, { status: 400 })
  }

  // ── Validate coupon ────────────────────────────────
  let couponDiscount = 0
  if (coupon_code) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('salon_id', userData.salon_id)
      .eq('code', coupon_code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (!coupon) return NextResponse.json({ error: 'Invalid or expired coupon' }, { status: 400 })
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 })
    }
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 })
    }

    const subtotalForCoupon = line_items.reduce((s: number, li: any) => s + (li.unit_price * li.quantity), 0)
    if (coupon.min_order_value && subtotalForCoupon < coupon.min_order_value) {
      return NextResponse.json({ error: `Minimum order ₹${coupon.min_order_value} required for this coupon` }, { status: 400 })
    }

    couponDiscount = coupon.discount_type === 'percentage'
      ? Math.min(subtotalForCoupon * (coupon.discount_value / 100), coupon.max_discount ?? Infinity)
      : coupon.discount_value

    // Increment usage
    await supabase.from('coupons').update({ used_count: coupon.used_count + 1 }).eq('id', coupon.id)
  }

  // ── Validate loyalty points ────────────────────────
  if (loyalty_points_to_use > 0) {
    const { data: customer } = await supabase
      .from('customers').select('loyalty_points').eq('id', customer_id).single()
    if (!customer || customer.loyalty_points < loyalty_points_to_use) {
      return NextResponse.json({ error: 'Insufficient loyalty points' }, { status: 400 })
    }
  }

  // ── Compute totals ─────────────────────────────────
  const subtotal    = line_items.reduce((s: number, li: any) => s + (li.unit_price * li.quantity), 0)
  const cgstAmt     = line_items.reduce((s: number, li: any) => s + (li.gst_amount / 2), 0)
  const sgstAmt     = cgstAmt
  const totalTax    = cgstAmt + sgstAmt
  const discountAmt = discount_type === 'percentage'
    ? subtotal * (discount_value / 100)
    : (discount_value ?? 0)
  const loyaltyDisc = loyalty_points_to_use * 0.5
  const grandTotal  = Math.max(0, subtotal + totalTax - discountAmt - couponDiscount - loyaltyDisc)
  const pointsEarned = Math.floor(grandTotal * 0.01)

  // ── Create invoice ─────────────────────────────────
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      salon_id: userData.salon_id,
      customer_id,
      appointment_id: appointment_id ?? null,
      line_items,
      subtotal,
      discount_amount: discountAmt + couponDiscount,
      discount_type: discount_type ?? null,
      coupon_code: coupon_code ?? null,
      taxable_amount: subtotal,
      cgst_amount: cgstAmt,
      sgst_amount: sgstAmt,
      igst_amount: 0,
      total_tax: totalTax,
      grand_total: grandTotal,
      loyalty_points_used: loyalty_points_to_use,
      loyalty_points_earned: pointsEarned,
      payment_status: 'paid',
      notes: notes ?? null,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  // ── Record payment ────────────────────────────────
  await supabase.from('payments').insert({
    salon_id: userData.salon_id,
    invoice_id: invoice.id,
    amount: grandTotal,
    method: payment_method,
    status: 'paid',
    created_by: user.id,
  })

  // ── Log loyalty redemption ────────────────────────
  if (loyalty_points_to_use > 0) {
    await supabase.from('loyalty_transactions').insert({
      salon_id: userData.salon_id,
      customer_id,
      type: 'redeemed',
      points: -loyalty_points_to_use,
      reference_id: invoice.id,
      description: `Redeemed for invoice ${invoice.invoice_number}`,
    })
  }

  // ── Mark appointment completed if linked ──────────
  if (appointment_id) {
    await supabase.from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointment_id)
  }

  return NextResponse.json({ data: invoice }, { status: 201 })
}
