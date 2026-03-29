import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/appointments/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      customer:customers(*),
      staff:staff(*),
      service:services(*, category:service_categories(name, color))
    `)
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

// PATCH /api/appointments/[id]
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { status, cancel_reason, internal_notes, start_time, appointment_date, staff_id } = body

  const updates: Record<string, unknown> = {}

  if (status) {
    updates.status = status
    if (status === 'confirmed') updates.confirmed_at = new Date().toISOString()
    if (status === 'cancelled') {
      updates.cancelled_at = new Date().toISOString()
      updates.cancel_reason = cancel_reason ?? null
    }
  }

  if (internal_notes !== undefined) updates.internal_notes = internal_notes
  if (start_time)        updates.start_time = start_time
  if (appointment_date)  updates.appointment_date = appointment_date
  if (staff_id)          updates.staff_id = staff_id

  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/appointments/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Soft-delete: mark as cancelled
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
