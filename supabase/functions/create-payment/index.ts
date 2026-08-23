import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { orderId } = await req.json()
    if (!orderId) throw new Error('orderId es obligatorio')

    const secretMap = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
    const secret = secretMap.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'
    if (!secret || !mpToken) throw new Error('Faltan secretos de Supabase o Mercado Pago')

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, secret)
    const { data: order, error: orderError } = await admin.from('orders').select('*').eq('id', orderId).single()
    if (orderError || !order) throw new Error(orderError?.message || 'Pedido no encontrado')
    if (order.status === 'paid') throw new Error('El pedido ya está pagado')

    const { data: items, error: itemsError } = await admin.from('order_items').select('*').eq('order_id', orderId)
    if (itemsError || !items?.length) throw new Error(itemsError?.message || 'El pedido no tiene fotografías')

    const preferenceItems = items.map((item) => ({
      id: String(item.photo_id),
      title: 'Fotografía deportiva SportPhoto',
      quantity: Number(item.quantity || 1),
      unit_price: Number(item.unit_price || 0),
      currency_id: 'COP',
    }))

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: preferenceItems,
        payer: { name: order.customer_name, email: order.customer_email, phone: { number: order.customer_phone } },
        external_reference: String(order.id),
        back_urls: {
          success: `${siteUrl}/checkout/success`,
          failure: `${siteUrl}/checkout/failure`,
          pending: `${siteUrl}/checkout/pending`,
        },
        auto_return: 'approved',
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      }),
    })
    const preference = await response.json()
    if (!response.ok) throw new Error(preference?.message || 'Mercado Pago rechazó la preferencia')

    const { error: updateError } = await admin.from('orders').update({ mp_preference_id: preference.id, payment_provider: 'mercadopago', payment_status: 'pending' }).eq('id', order.id)
    if (updateError) throw updateError

    return new Response(JSON.stringify({ ok: true, init_point: preference.init_point, sandbox_init_point: preference.sandbox_init_point, preference_id: preference.id }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ ok: false, error: error?.message || 'Error creando pago' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
