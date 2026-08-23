import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const CART_KEY = 'sportphoto_cart'

export default function AppLayout({
  children,
  showCart = true,
}) {
  const navigate = useNavigate()

  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    updateCartCount()

    function handleCartUpdate() {
      updateCartCount()
    }

    window.addEventListener(
      'sportphoto-cart-updated',
      handleCartUpdate
    )

    window.addEventListener(
      'storage',
      handleCartUpdate
    )

    return () => {
      window.removeEventListener(
        'sportphoto-cart-updated',
        handleCartUpdate
      )

      window.removeEventListener(
        'storage',
        handleCartUpdate
      )
    }
  }, [])

  function updateCartCount() {
    try {
      const saved =
        localStorage.getItem(CART_KEY)

      if (!saved) {
        setCartCount(0)
        return
      }

      const cart = JSON.parse(saved)

      if (!Array.isArray(cart)) {
        setCartCount(0)
        return
      }

      const total = cart.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 1),
        0
      )

      setCartCount(total)
    } catch (error) {
      console.error(
        'Error leyendo carrito:',
        error
      )

      setCartCount(0)
    }
  }

  return (
    <div className="sp-app">
      <header className="sp-header">
        <button
          type="button"
          className="sp-logo"
          onClick={() => navigate('/')}
        >
          SPORT<span>PHOTO</span>
        </button>

        <nav className="sp-nav">
          <button
            type="button"
            onClick={() => navigate('/')}
          >
            Eventos
          </button>

          {showCart && (
            <button
              type="button"
              className="sp-cart-button"
              onClick={() => navigate('/cart')}
            >
              <span>Carrito</span>

              {cartCount > 0 && (
                <span className="sp-cart-count">
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </nav>
      </header>

      <main className="sp-main">
        {children}
      </main>

      <footer className="sp-footer">
        <div className="sp-footer-logo">
          SPORT<span>PHOTO</span>
        </div>

        <div className="sp-footer-text">
          Fotografía deportiva profesional
        </div>
      </footer>
    </div>
  )
}