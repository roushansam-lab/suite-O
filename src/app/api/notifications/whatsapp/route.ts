import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── WhatsApp message templates ─────────────────────────
function getTemplate(type: string, data: Record<string, string>): string {
  const templates: Record<string, string> = {
    booking_confirmation: `✅ *Booking Confirmed!*

Hello ${data.customer_name}! 🌸

Your appointment at *${data.salon_name}* is confirmed.

📅 Date: ${data.date}
⏰ Time: ${data.time}
💇 Service: ${data.service}
👩‍💼 Stylist: ${data.staff}

📍 ${data.address}

We look forward to seeing you! For changes, call us at ${data.phone}.

_— Team ${data.salon_name}_`,

    reminder: `⏰ *Appointment Reminder*

Hello ${data.customer_name}! 

This is a friendly reminder about your appointment *tomorrow* at *${data.salon_name}*.

📅 ${data.date} at ⏰ ${data.time}
💇 ${data.service} with ${data.staff}

See you soon! 💖`,

    cancellation: `❌ *Appointment Cancelled*

Hello ${data.customer_name},

Your appointment on ${data.date} at ${data.time} has been cancelled.

To rebook, call us at ${data.phone} or visit us.

_— Team ${data.salon_name}_`,

    birthday: `🎂 *Happy Birthday, ${data.customer_name}!*

Wishing you a wonderful birthday from all of us at *${data.salon_name}*! 🌺

As a birthday gift, enjoy *20% off* your next visit this month.

Book now: ${data.phone}

_With love, Team ${data.salon_name}_ 💕`,
  }
  return templates[type] ?? `Hello ${data.customer_name}, you have a message from ${data.salon_name}.`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, appointment_id, customer_id, custom_message } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users').select('salon_id').eq('id', user.id).single()
    if (!userData?.salon_id) return NextResponse.json({ error: 'No salon' }, { status: 403 })

    let appointment: any = null
    let customer: any = null
    let salon: any = null

    if (appointment_id) {
      const { data } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(full_name, phone),
          staff:staff(full_name),
          service:services(name),
          salon:salons(name, phone, address)
        `)
        .eq('id', appointment_id)
        .single()
      appointment = data
      customer = data?.customer
      salon = data?.salon
    } else if (customer_id) {
      const { data: c } = await supabase.from('customers').select('*').eq('id', customer_id).single()
      const { data: s } = await supabase.from('salons').select('*').eq('id', userData.salon_id).single()
      customer = c
      salon = s
    }

    if (!customer || !salon) {
      return NextResponse.json({ error: 'Customer or salon not found' }, { status: 404 })
    }

    // Format phone for WhatsApp
    const rawPhone = customer.phone?.replace(/[\s\-\(\)]/g, '')
    const phone = rawPhone?.startsWith('+') ? rawPhone : `+91${rawPhone?.replace(/^0/, '')}`

    // Build template data
    const templateData: Record<string, string> = {
      customer_name: customer.full_name,
      salon_name: salon.name,
      phone: salon.phone ?? '',
      address: salon.address ?? '',
      date: appointment?.appointment_date
        ? new Date(appointment.appointment_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '',
      time: appointment?.start_time ?? '',
      service: appointment?.service?.name ?? '',
      staff: appointment?.staff?.full_name ?? '',
    }

    const message = custom_message ?? getTemplate(type, templateData)

    // ── Send via Twilio (if configured) ───────────────
    let externalId: string | null = null
    let sendStatus = 'sent'

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`
        const form = new URLSearchParams({
          To:   `whatsapp:${phone}`,
          From: process.env.TWILIO_WHATSAPP_NUMBER ?? 'whatsapp:+14155238886',
          Body: message,
        })

        const twilioRes = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
            ).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form,
        })

        const twilioData = await twilioRes.json()
        if (twilioData.sid) {
          externalId = twilioData.sid
        } else {
          sendStatus = 'failed'
        }
      } catch {
        sendStatus = 'failed'
      }
    } else {
      // Mock mode — log to console in dev
      console.log('[WhatsApp Mock]', { to: phone, message: message.slice(0, 80) + '…' })
    }

    // ── Log notification ───────────────────────────────
    await supabase.from('notifications').insert({
      salon_id: userData.salon_id,
      customer_id: customer.id ?? customer_id,
      type,
      channel: 'whatsapp',
      recipient: phone,
      message,
      status: sendStatus,
      external_id: externalId,
      appointment_id: appointment_id ?? null,
      sent_at: new Date().toISOString(),
    })

    // Mark reminder as sent on appointment
    if (appointment_id && type === 'reminder') {
      await supabase.from('appointments')
        .update({ reminder_sent: true })
        .eq('id', appointment_id)
    }

    return NextResponse.json({
      success: true,
      status: sendStatus,
      mock: !process.env.TWILIO_ACCOUNT_SID,
      message: message.slice(0, 100) + '…',
    })
  } catch (err) {
    console.error('WhatsApp API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── GET: fetch notification history ───────────────────
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase.from('users').select('salon_id').eq('id', user.id).single()
  if (!userData?.salon_id) return NextResponse.json({ error: 'No salon' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') ?? '50')

  const { data, error } = await supabase
    .from('notifications')
    .select('*, customer:customers(full_name)')
    .eq('salon_id', userData.salon_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
