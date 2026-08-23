import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json()
    const paymentId = body?.data?.id || body?.id
    if (!paymentId) return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })

    const secretMap = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
    const secret = secretMap.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!secret || !mpToken) throw new Error('Faltan secretos')

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${mpToken}` } })
    const payment = await response.json()
    if (!response.ok) throw new Error(payment?.message || 'No se pudo consultar el pago')

    const orderId = payment.external_reference
    if (!orderId) return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, secret)
    let paymentStatus = 'pending'
    let status = 'pending'
    let paidAt = null
    if (payment.status === 'approved') { paymentStatus = 'approved'; status = 'paid'; paidAt = new Date().toISOString() }
    else if (payment.status === 'rejected') paymentStatus = 'rejected'
    else if (payment.status === 'cancelled') paymentStatus = 'cancelled'

    const { error } = await admin.from('orders').update({ mp_payment_id: String(payment.id), payment_provider: 'mercadopago', payment_status: paymentStatus, status, paid_at: paidAt }).eq('id', orderId)
    if (error) throw error

    return new Response(JSON.stringify({ received: true, order_id: orderId, payment_status: paymentStatus }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ received: false, error: error?.message || 'Webhook error' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
