import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const CART_KEY = 'sportphoto_cart'

function money(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export default function Cart() {
  const navigate = useNavigate()
  const [cart, setCart] = useState([])

  useEffect(() => {
    load()
    const update = () => load()
    window.addEventListener('sportphoto-cart-updated', update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener('sportphoto-cart-updated', update)
      window.removeEventListener('storage', update)
    }
  }, [])

  function load() {
    try {
      const saved = localStorage.getItem(CART_KEY)
      const parsed = saved ? JSON.parse(saved) : []
      setCart(Array.isArray(parsed) ? parsed : [])
    } catch {
      setCart([])
    }
  }

  function save(next) {
    setCart(next)
    localStorage.setItem(CART_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event('sportphoto-cart-updated'))
  }

  function remove(id) {
    save(cart.filter((item) => item.id !== id))
  }

  function quantity(id, delta) {
    save(cart.map((item) => {
      if (item.id !== id) return item
      return { ...item, quantity: Math.max(1, Number(item.quantity || 1) + delta) }
    }))
  }

  function clear() {
    save([])
  }

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

  return (
    <main className="sp-shop-page">
      <header className="sp-shop-header">
        <button className="sp-shop-logo" onClick={() => navigate('/')}>
          <span className="sp-shop-mark">SP</span> SportPhoto
        </button>
        <button className="sp-shop-back" onClick={() => navigate('/')}>← Seguir comprando</button>
      </header>

      <section className="sp-shop-container">
        <div className="sp-shop-kicker">TU SELECCIÓN</div>
        <h1>Tu carrito</h1>
        <p className="sp-shop-subtitle">{totalItems} fotografía{totalItems === 1 ? '' : 's'} seleccionada{totalItems === 1 ? '' : 's'}.</p>

        {!cart.length ? (
          <div className="sp-shop-empty">
            <div className="sp-shop-empty-icon">🛒</div>
            <h2>Tu carrito está vacío</h2>
            <p>Busca tus fotografías y agrega las que quieras comprar.</p>
            <button className="sp-shop-primary" onClick={() => navigate('/')}>Buscar mis fotos</button>
          </div>
        ) : (
          <div className="sp-shop-grid">
            <section className="sp-shop-list">
              {cart.map((item) => (
                <article className="sp-shop-item" key={item.id}>
                  <div className="sp-shop-thumb">
                    {item.url ? <img src={item.url} alt="" /> : <span>📸</span>}
                  </div>
                  <div className="sp-shop-item-info">
                    <strong>{item.file_name || 'Fotografía deportiva'}</strong>
                    <span>{item.participant_name ? item.participant_name : item.dorsal ? `Dorsal ${item.dorsal}` : 'Fotografía'}</span>
                    <span>{money(item.price)} c/u</span>
                  </div>
                  <div className="sp-shop-item-actions">
                    <div className="sp-qty">
                      <button onClick={() => quantity(item.id, -1)}>−</button>
                      <span>{item.quantity || 1}</span>
                      <button onClick={() => quantity(item.id, 1)}>+</button>
                    </div>
                    <strong>{money(Number(item.price || 0) * Number(item.quantity || 1))}</strong>
                    <button className="sp-remove" onClick={() => remove(item.id)}>Quitar</button>
                  </div>
                </article>
              ))}

              <button className="sp-shop-clear" onClick={clear}>Vaciar carrito</button>
            </section>

            <aside className="sp-shop-summary">
              <div className="sp-shop-kicker">RESUMEN</div>
              <h2>Tu pedido</h2>
              <div className="sp-summary-row"><span>Fotografías</span><strong>{totalItems}</strong></div>
              <div className="sp-summary-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              {discount > 0 && <div className="sp-summary-discount"><span>Descuento ({Math.round(discountRate * 100)}%)</span><strong>−{money(discount)}</strong></div>}
              <div className="sp-summary-divider" />
              <div className="sp-summary-total"><span>Total</span><strong>{money(total)}</strong></div>
              <button className="sp-shop-primary sp-full" onClick={() => navigate('/checkout')}>Continuar al checkout →</button>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}
