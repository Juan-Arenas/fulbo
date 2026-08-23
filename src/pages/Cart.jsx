import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const CART_KEY = 'sportphoto_cart'

function money(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0))
}

export default function Cart() {
  const navigate = useNavigate()
  const [cart, setCart] = useState([])

  useEffect(() => {
    load()
    const sync = () => load()
    window.addEventListener('storage', sync)
    window.addEventListener('sportphoto-cart-updated', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('sportphoto-cart-updated', sync)
    }
  }, [])

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
      setCart(Array.isArray(value) ? value : [])
    } catch { setCart([]) }
  }

  function save(next) {
    setCart(next)
    localStorage.setItem(CART_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event('sportphoto-cart-updated'))
  }

  function changeQuantity(id, delta) {
    save(cart.map(item => item.id === id ? { ...item, quantity: Math.max(1, Number(item.quantity || 1) + delta) } : item))
  }

  function remove(id) { save(cart.filter(item => item.id !== id)) }
  function clear() { save([]) }

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0), [cart])
  const items = useMemo(() => cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0), [cart])

  return (
    <main className="sp-page">
      <section className="sp-container">
        <div className="sp-eyebrow">SPORTPHOTO / CARRITO</div>
        <h1 className="sp-title">Tus fotografías</h1>
        <p className="sp-subtitle">Revisa tus fotos antes de continuar al checkout.</p>

        {!cart.length ? (
          <div className="sp-card sp-empty-page">
            <div className="sp-empty-icon">🛒</div>
            <h2>Tu carrito está vacío</h2>
            <p>Busca un evento y agrega tus mejores fotografías.</p>
            <button className="sp-primary" onClick={() => navigate('/')}>Ver eventos</button>
          </div>
        ) : (
          <div className="sp-cart-layout">
            <section className="sp-card">
              <div className="sp-card-head"><div><span>FOTOS</span><h2>{items} {items === 1 ? 'fotografía' : 'fotografías'}</h2></div><button className="sp-link-button" onClick={clear}>Vaciar carrito</button></div>
              <div className="sp-cart-list">
                {cart.map(item => (
                  <article className="sp-cart-item" key={item.id}>
                    <div className="sp-cart-image">{item.url ? <img src={item.url} alt="" /> : <span>SPORTPHOTO</span>}</div>
                    <div className="sp-cart-info"><strong>{item.participant_name || item.file_name || 'Fotografía'}</strong><small>{item.dorsal ? `Dorsal ${item.dorsal}` : 'Fotografía deportiva'}</small><button className="sp-remove" onClick={() => remove(item.id)}>Eliminar</button></div>
                    <div className="sp-cart-controls"><div className="sp-qty"><button onClick={() => changeQuantity(item.id, -1)}>−</button><span>{item.quantity || 1}</span><button onClick={() => changeQuantity(item.id, 1)}>+</button></div><strong>{money(Number(item.price || 0) * Number(item.quantity || 1))}</strong></div>
                  </article>
                ))}
              </div>
            </section>
            <aside className="sp-card sp-summary-card">
              <span>RESUMEN</span><h2>Total</h2>
              <div className="sp-summary-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div className="sp-summary-row"><span>Descuento</span><strong>{money(0)}</strong></div>
              <div className="sp-total"><span>Total</span><strong>{money(subtotal)}</strong></div>
              <button className="sp-primary sp-wide" onClick={() => navigate('/checkout')}>Continuar al checkout →</button>
              <button className="sp-secondary sp-wide" onClick={() => navigate('/')}>Seguir comprando</button>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}
