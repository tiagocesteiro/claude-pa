import { NextRequest, NextResponse } from 'next/server'

// n8n sends order events here. This endpoint is called by Supabase DB webhooks
// or directly from the app after order state changes.
// n8n workflow: receives payload → routes to WhatsApp/email for buyer or maker.

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL

    if (!n8nWebhookUrl) {
      console.log('N8N_WEBHOOK_URL not set — skipping notification', payload)
      return NextResponse.json({ ok: true, forwarded: false })
    }

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    return NextResponse.json({ ok: true, forwarded: true, status: response.status })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
