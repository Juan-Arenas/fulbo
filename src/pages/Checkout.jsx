import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CART_KEY = 'sportphoto_cart'

function money(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export default function Checkout() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [cart, setCart] = useState([])
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY)
      const parsed = saved ? JSON.parse(saved) : []
      if (!Array.isArray(parsed) || !parsed.length) {
        navigate('/cart', { replace: true })
        return
      }
      setCart(parsed)
    } catch {
      navigate('/cart', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [navigate])

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0),
    [cart]
  )
  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
    [cart]
  )
  const discountRate = totalItems >= 10 ? 0.30 : totalItems >= 5 ? 0.20 : totalItems >= 3 ? 0.10 : 0
  const discount = subtotal * discountRate
  const total = subtotal - discount

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Completa nombre, correo y teléfono.')
      return
    }

    setCreating(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user?.id || null,
          customer_name: form.name.trim(),
          customer_email: form.email.trim(),
          customer_phone: form.phone.trim(),
          subtotal,
          discount,
          total,
          status: 'pending',
          payment_provider: 'mercadopago',
          payment_id: null,
          mp_preference_id: null,
          mp_payment_id: null,
          payment_status: 'pending',
          paid_at: null,
        })
        .select('*')
        .single()

      if (orderError) throw orderError

      const orderItems = cart.map((item) => {
        const quantity = Number(item.quantity || 1)
        const unitPrice = Number(item.price || 0)
        return {
          order_id: order.id,
          photo_id: item.id,
          quantity,
          unit_price: unitPrice,
          discount: 0,
          total: unitPrice * quantity,
        }
      })

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        await supabase.from('orders').delete().eq('id', order.id)
        throw itemsError
      }

      const { data: payment, error: paymentError } = await supabase.functions.invoke(
        'create-payment',
        { body: { orderId: order.id } }
      )

      if (paymentError) throw paymentError
      if (!payment?.init_point) {
        throw new Error(payment?.error || 'Mercado Pago no devolvió la URL de pago.')
      }

      localStorage.removeItem(CART_KEY)
      window.dispatchEvent(new Event('sportphoto-cart-updated'))
      window.location.href = payment.init_point
    } catch (err) {
      console.error(err)
      setError(err?.message || 'No fue posible iniciar el pago.')
      setCreating(false)
    }
  }

  if (loading) {
    return <main className="sp-shop-page"><div className="sp-shop-empty">Preparando checkout...</div></main>
  }

  const paymentState = params.get('payment')
  if (paymentState) {
    return (
      <main className="sp-shop-page">
        <section className="sp-shop-success">
          <div className="sp-success-icon">{paymentState === 'success' ? '✓' : '!'}</div>
          <div className="sp-shop-kicker">PAGO</div>
          <h1>{paymentState === 'success' ? 'Pago recibido' : paymentState === 'pending' ? 'Pago pendiente' : 'Pago no aprobado'}</h1>
          <p>El estado definitivo del pedido se actualiza con la notificación de Mercado Pago.</p>
          <button className="sp-shop-primary" onClick={() => navigate('/')}>Volver a SportPhoto</button>
        </section>
      </main>
    )
  }

  return (
    <main className="sp-shop-page">
      <header className="sp-shop-header">
        <button className="sp-shop-logo" onClick={() => navigate('/')}>
          <span className="sp-shop-mark">SP</span> SportPhoto
        </button>
        <button className="sp-shop-back" onClick={() => navigate('/cart')}>← Volver al carrito</button>
      </header>

      <section className="sp-shop-container">
        <div className="sp-shop-kicker">CHECKOUT</div>
        <h1>Finalizar compra</h1>
        <p className="sp-shop-subtitle">Completa tus datos para continuar con Mercado Pago.</p>

        {error && <div className="sp-shop-error">{error}</div>}

        <div className="sp-shop-grid">
          <form className="sp-checkout-card" onSubmit={submit}>
            <h2>Información del comprador</h2>
            <label>Nombre completo<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Juan Pérez" autoComplete="name" /></label>
            <label>Correo electrónico<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" autoComplete="email" /></label>
            <label>WhatsApp / teléfono<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+57 300 000 0000" autoComplete="tel" /></label>
            <div className="sp-payment-note">💳 <div><strong>Mercado Pago</strong><span>Serás enviado a la plataforma segura para completar el pago.</span></div></div>
            <button className="sp-shop-primary sp-full" disabled={creating}>{creating ? 'Preparando pago...' : 'Continuar a Mercado Pago →'}</button>
          </form>

          <aside className="sp-shop-summary">
            <div className="sp-shop-kicker">RESUMEN</div>
            <h2>Tu pedido</h2>
            {cart.map((item) => (
              <div className="sp-summary-item" key={item.id}>
                <span>{item.file_name || 'Fotografía'} × {item.quantity || 1}</span>
                <strong>{money(Number(item.price || 0) * Number(item.quantity || 1))}</strong>
              </div>
            ))}
            <div className="sp-summary-divider" />
            <div className="sp-summary-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            {discount > 0 && <div className="sp-summary-discount"><span>Descuento</span><strong>−{money(discount)}</strong></div>}
            <div className="sp-summary-total"><span>Total</span><strong>{money(total)}</strong></div>
          </aside>
        </div>
      </section>
    </main>
  )
}
