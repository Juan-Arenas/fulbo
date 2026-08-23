import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CART_KEY = 'sportphoto_cart'
const money = value => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0))

export default function Checkout() {
  const navigate = useNavigate()
  const [cart, setCart] = useState([])
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
      if (!Array.isArray(value) || !value.length) { navigate('/cart'); return }
      setCart(value)
    } catch { navigate('/cart') }
    supabase.auth.getUser().then(({ data }) => { if (data?.user?.email) setForm(v => ({ ...v, email: data.user.email })) }).finally(() => setLoading(false))
  }, [navigate])

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0), [cart])
  const total = subtotal

  async function submit(e) {
    e.preventDefault(); setError('')
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) { setError('Completa nombre, correo y teléfono.'); return }
    setCreating(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const invalid = cart.find(item => !item.id)
      if (invalid) throw new Error('Hay una fotografía inválida en el carrito.')

      const { data: order, error: orderError } = await supabase.from('orders').insert({
        customer_id: auth?.user?.id || null,
        customer_name: form.name.trim(), customer_email: form.email.trim(), customer_phone: form.phone.trim(),
        subtotal, discount: 0, total, status: 'pending', payment_provider: 'mercadopago', payment_id: null,
        mp_preference_id: null, mp_payment_id: null, paid_at: null, payment_status: 'pending',
      }).select('*').single()
      if (orderError) throw orderError

      const items = cart.map(item => ({ order_id: order.id, photo_id: item.id, quantity: Number(item.quantity || 1), unit_price: Number(item.price || 0), discount: 0, total: Number(item.price || 0) * Number(item.quantity || 1) }))
      const { error: itemError } = await supabase.from('order_items').insert(items)
      if (itemError) {
        await supabase.from('orders').delete().eq('id', order.id)
        throw itemError
      }

      const { data: payment, error: paymentError } = await supabase.functions.invoke('create-payment', { body: { orderId: order.id } })
      if (paymentError) throw paymentError
      if (!payment?.init_point) throw new Error(payment?.error || 'No se recibió la URL de Mercado Pago.')

      localStorage.removeItem(CART_KEY)
      window.dispatchEvent(new Event('sportphoto-cart-updated'))
      window.location.href = payment.init_point
    } catch (e) {
      console.error(e); setError(e?.message || 'No fue posible iniciar el pago.')
    } finally { setCreating(false) }
  }

  if (loading) return <main className="sp-page"><section className="sp-container"><div className="sp-card sp-empty-page">Preparando checkout...</div></section></main>

  return <main className="sp-page"><section className="sp-container">
    <button className="sp-back" onClick={() => navigate('/cart')}>← Volver al carrito</button>
    <div className="sp-eyebrow">SPORTPHOTO / CHECKOUT</div><h1 className="sp-title">Finalizar compra</h1><p className="sp-subtitle">Completa tus datos y continúa al pago seguro.</p>
    {error && <div className="sp-error">{error}</div>}
    <div className="sp-checkout-layout">
      <form className="sp-card sp-form" onSubmit={submit}>
        <span>DATOS DEL CLIENTE</span><h2>Información de contacto</h2>
        <label>Nombre completo<input value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} required /></label>
        <label>Correo electrónico<input type="email" value={form.email} onChange={e => setForm(v => ({ ...v, email: e.target.value }))} required /></label>
        <label>Teléfono / WhatsApp<input type="tel" value={form.phone} onChange={e => setForm(v => ({ ...v, phone: e.target.value }))} required /></label>
        <div className="sp-payment-note"><strong>Mercado Pago</strong><p>Serás enviado a Mercado Pago para completar el pago.</p></div>
        <button className="sp-primary sp-wide" disabled={creating}>{creating ? 'Preparando pago...' : `Pagar ${money(total)} →`}</button>
      </form>
      <aside className="sp-card sp-summary-card"><span>RESUMEN</span><h2>{cart.length} fotos</h2>{cart.map(item => <div className="sp-summary-row" key={item.id}><span>{item.file_name || 'Fotografía'} × {item.quantity || 1}</span><strong>{money(Number(item.price || 0) * Number(item.quantity || 1))}</strong></div>)}<div className="sp-total"><span>Total</span><strong>{money(total)}</strong></div></aside>
    </div>
  </section></main>
}
