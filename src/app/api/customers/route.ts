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
  const q        = searchParams.get('q') ?? ''
  const page     = parseInt(searchParams.get('page') ?? '1')
  const per_page = parseInt(searchParams.get('per_page') ?? '20')
  const tag      = searchParams.get('tag')

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('salon_id', userData.salon_id)
    .eq('is_active', true)
    .order('full_name')
    .range((page - 1) * per_page, page * per_page - 1)

  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
  if (tag) query = query.contains('tags', [tag])

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
  const { full_name, phone } = body

  if (!full_name || !phone) {
    return NextResponse.json({ error: 'full_name and phone are required' }, { status: 400 })
  }

  // Check duplicate phone
  const { data: existing } = await supabase
    .from('customers')
    .select('id, full_name')
    .eq('salon_id', userData.salon_id)
    .eq('phone', phone)
    .single()

  if (existing) {
    return NextResponse.json({
      error: `Customer with this phone already exists: ${existing.full_name}`,
      existing_id: existing.id,
    }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({ salon_id: userData.salon_id, ...body })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
