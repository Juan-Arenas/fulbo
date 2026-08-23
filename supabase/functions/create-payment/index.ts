import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const mercadoPagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')

    if (!supabaseUrl || !supabaseServiceRoleKey || !mercadoPagoToken) {
      throw new Error('Faltan secretos de Supabase o Mercado Pago.')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { orderId } = await req.json()
    if (!orderId) throw new Error('orderId es obligatorio.')

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) throw new Error(orderError?.message || 'Pedido no encontrado.')

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)

    if (itemsError) throw new Error(itemsError.message)
    if (!items?.length) throw new Error('El pedido no tiene fotografías.')

    const mpItems = items.map((item) => ({
      id: String(item.photo_id),
      title: 'Fotografía deportiva',
      quantity: Number(item.quantity || 1),
      unit_price: Number(item.unit_price || 0),
      currency_id: 'COP',
    }))

    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: mpItems,
        payer: {
          name: order.customer_name,
          email: order.customer_email,
          phone: { number: order.customer_phone },
        },
        external_reference: String(order.id),
        back_urls: {
          success: `${siteUrl}/checkout?payment=success`,
          failure: `${siteUrl}/checkout?payment=failure`,
          pending: `${siteUrl}/checkout?payment=pending`,
        },
        auto_return: 'approved',
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      }),
    })

    const preference = await response.json()
    if (!response.ok) throw new Error(preference?.message || 'Mercado Pago rechazó la preferencia.')

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        mp_preference_id: preference.id,
        payment_provider: 'mercadopago',
        payment_status: 'pending',
      })
      .eq('id', order.id)

    if (updateError) throw new Error(updateError.message)

    return new Response(JSON.stringify({
      ok: true,
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({
      ok: false,
      error: error?.message || 'Error creando pago',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
