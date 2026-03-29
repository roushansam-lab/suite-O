import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/appointments
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('salon_id').eq('id', user.id).single()
  if (!userData?.salon_id) return NextResponse.json({ error: 'No salon' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const date       = searchParams.get('date')
  const from       = searchParams.get('from')
  const to         = searchParams.get('to')
  const staff_id   = searchParams.get('staff_id')
  const status     = searchParams.get('status')
  const customer_id = searchParams.get('customer_id')
  const page       = parseInt(searchParams.get('page') ?? '1')
  const per_page   = parseInt(searchParams.get('per_page') ?? '50')

  let query = supabase
    .from('appointments')
    .select(`
      *,
      customer:customers(id, full_name, phone, avatar_url),
      staff:staff(id, full_name, avatar_url, designation),
      service:services(id, name, duration_minutes, base_price,
        category:service_categories(name, color))
    `, { count: 'exact' })
    .eq('salon_id', userData.salon_id)
    .order('appointment_date')
    .order('start_time')
    .range((page - 1) * per_page, page * per_page - 1)

  if (date)        query = query.eq('appointment_date', date)
  if (from)        query = query.gte('appointment_date', from)
  if (to)          query = query.lte('appointment_date', to)
  if (staff_id)    query = query.eq('staff_id', staff_id)
  if (status)      query = query.eq('status', status)
  if (customer_id) query = query.eq('customer_id', customer_id)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count, page, per_page })
}

// POST /api/appointments
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('salon_id').eq('id', user.id).single()
  if (!userData?.salon_id) return NextResponse.json({ error: 'No salon' }, { status: 403 })

  const body = await request.json()
  const { customer_id, staff_id, service_id, appointment_date, start_time, notes, source, pricing_tier } = body

  if (!customer_id || !staff_id || !service_id || !appointment_date || !start_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get service duration
  const { data: service, error: svcErr } = await supabase
    .from('services').select('duration_minutes, base_price').eq('id', service_id).single()
  if (svcErr || !service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

  // Compute end time
  const [h, m] = start_time.split(':').map(Number)
  const endMins = h * 60 + m + service.duration_minutes
  const end_time = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`

  // Get buffer
  const { data: salon } = await supabase
    .from('salons').select('booking_buffer_minutes, auto_confirm_bookings')
    .eq('id', userData.salon_id).single()
  const buffer = salon?.booking_buffer_minutes ?? 10

  // Check conflicts
  const { data: conflicts } = await supabase
    .from('appointments')
    .select('id, start_time, end_time')
    .eq('staff_id', staff_id)
    .eq('appointment_date', appointment_date)
    .not('status', 'in', '("cancelled","no_show")')
    .lt('start_time', end_time)
    .gt('end_time', start_time)

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({
      error: `Slot conflict: staff is booked ${conflicts[0].start_time}–${conflicts[0].end_time}`
    }, { status: 409 })
  }

  const status = salon?.auto_confirm_bookings ? 'confirmed' : 'pending'

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      salon_id: userData.salon_id,
      customer_id,
      staff_id,
      service_id,
      appointment_date,
      start_time,
      end_time,
      duration_minutes: service.duration_minutes,
      service_price: service.base_price,
      status,
      source: source ?? 'walk_in',
      notes: notes ?? null,
      pricing_tier: pricing_tier ?? null,
      created_by: user.id,
      ...(status === 'confirmed' ? { confirmed_at: new Date().toISOString() } : {}),
    })
    .select(`*, customer:customers(full_name, phone), service:services(name), staff:staff(full_name)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
