import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CART_KEY = 'sportphoto_cart'

export default function Checkout() {
  const navigate = useNavigate()

  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    loadCheckout()
  }, [])

  async function loadCheckout() {
    try {
      const saved = localStorage.getItem(CART_KEY)
      const parsed = saved ? JSON.parse(saved) : []

      if (!Array.isArray(parsed) || parsed.length === 0) {
        navigate('/cart')
        return
      }

      setCart(parsed)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.email) {
        setForm((current) => ({
          ...current,
          email: user.email,
        }))
      }
    } catch (err) {
      console.error('Error cargando checkout:', err)
      setError('No se pudo cargar el checkout.')
    } finally {
      setLoading(false)
    }
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function formatMoney(value) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(value || 0))
  }

  const subtotal = useMemo(() => {
    return cart.reduce((total, item) => {
      const price = Number(item.price || 0)
      const quantity = Number(item.quantity || 1)

      return total + price * quantity
    }, 0)
  }, [cart])

  const totalItems = useMemo(() => {
    return cart.reduce((total, item) => {
      return total + Number(item.quantity || 1)
    }, 0)
  }, [cart])

  const discount = 0
  const total = Math.max(0, subtotal - discount)

  async function createOrder(event) {
    event.preventDefault()

    setError('')

    const customerName = form.name.trim()
    const customerEmail = form.email.trim()
    const customerPhone = form.phone.trim()

    if (!customerName) {
      setError('Escribe el nombre completo.')
      return
    }

    if (!customerEmail) {
      setError('Escribe el correo electrónico.')
      return
    }

    if (!customerPhone) {
      setError('Escribe el teléfono.')
      return
    }

    if (!cart.length) {
      setError('El carrito está vacío.')
      return
    }

    setCreating(true)

    try {
      /*
       * Usuario autenticado, si existe.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.warn(
          'No se pudo obtener el usuario:',
          userError
        )
      }

      /*
       * Verificamos que cada elemento tenga
       * realmente un ID de fotografía.
       */
      const invalidItem = cart.find(
        (item) => !item.id
      )

      if (invalidItem) {
        throw new Error(
          'Hay una fotografía en el carrito sin ID válido.'
        )
      }

      /*
       * ==========================================
       * 1. CREAR ORDERS
       * ==========================================
       */

      const orderData = {
        customer_id: user?.id || null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,

        subtotal,
        discount,
        total,

        status: 'pending',

        payment_provider: null,
        payment_id: null,

        mp_preference_id: null,
        mp_payment_id: null,

        payment_status: 'pending',
        paid_at: null,
      }

      console.log('Creando pedido:', orderData)

      const {
        data: order,
        error: orderError,
      } = await supabase
        .from('orders')
        .insert(orderData)
        .select('*')
        .single()

      if (orderError) {
        console.error(
          'Error creando orders:',
          orderError
        )

        throw new Error(
          orderError.message ||
            'No se pudo crear el pedido.'
        )
      }

      console.log('Pedido creado:', order)

      /*
       * ==========================================
       * 2. CREAR ORDER_ITEMS
       * ==========================================
       */

      const orderItems = cart.map((item) => {
        const quantity = Number(
          item.quantity || 1
        )

        const unitPrice = Number(
          item.price || 0
        )

        return {
          order_id: order.id,
          photo_id: item.id,
          quantity,
          unit_price: unitPrice,
          discount: 0,
          total: unitPrice * quantity,
        }
      })

      console.log(
        'Creando items del pedido:',
        orderItems
      )

      const {
        data: createdItems,
        error: itemsError,
      } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select('*')

      if (itemsError) {
        console.error(
          'Error creando order_items:',
          itemsError
        )

        /*
         * Si los items fallan intentamos eliminar
         * el pedido que acabamos de crear.
         */
        await supabase
          .from('orders')
          .delete()
          .eq('id', order.id)

        throw new Error(
          itemsError.message ||
            'No se pudieron guardar las fotografías del pedido.'
        )
      }

      console.log(
        'Items creados:',
        createdItems
      )

      /*
       * ==========================================
       * 3. VACIAR CARRITO
       * ==========================================
       */

      localStorage.removeItem(CART_KEY)

      window.dispatchEvent(
        new Event('sportphoto-cart-updated')
      )

      /*
       * ==========================================
       * 4. MOSTRAR CONFIRMACIÓN
       * ==========================================
       */

      setSuccess({
        id: order.id,
        total: order.total,
        customerName,
        email: customerEmail,
      })
    } catch (err) {
      console.error(
        'ERROR COMPLETO DEL CHECKOUT:',
        err
      )

      setError(
        err?.message ||
          'No fue posible crear el pedido.'
      )
    } finally {
      setCreating(false)
    }
  }

  /*
   * ============================================
   * CARGANDO
   * ============================================
   */

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.center}>
          <div style={styles.logo}>
            SPORT<span>PHOTO</span>
          </div>

          <div style={styles.spinner} />

          <p style={styles.loadingText}>
            Preparando checkout...
          </p>
        </div>
      </main>
    )
  }

  /*
   * ============================================
   * PEDIDO CREADO
   * ============================================
   */

  if (success) {
    return (
      <main style={styles.page}>
        <header style={styles.header}>
          <button
            onClick={() => navigate('/')}
            style={styles.logoButton}
          >
            SPORT<span>PHOTO</span>
          </button>
        </header>

        <section style={styles.successPage}>
          <div style={styles.successIcon}>
            ✓
          </div>

          <div style={styles.eyebrow}>
            PEDIDO CREADO
          </div>

          <h1 style={styles.successTitle}>
            ¡Pedido recibido!
          </h1>

          <p style={styles.successText}>
            Gracias, {success.customerName}.
            Tu pedido fue registrado correctamente.
          </p>

          <div style={styles.orderBox}>
            <div style={styles.orderRow}>
              <span>Pedido</span>

              <strong>
                #{String(success.id)
                  .slice(0, 8)
                  .toUpperCase()}
              </strong>
            </div>

            <div style={styles.orderRow}>
              <span>Correo</span>

              <strong>
                {success.email}
              </strong>
            </div>

            <div style={styles.orderRow}>
              <span>Total</span>

              <strong>
                {formatMoney(success.total)}
              </strong>
            </div>

            <div style={styles.orderRow}>
              <span>Estado</span>

              <strong style={styles.pending}>
                Pendiente de pago
              </strong>
            </div>
          </div>

          <p style={styles.paymentMessage}>
            El pedido ya está guardado en el
            sistema. El siguiente paso será
            conectar Mercado Pago.
          </p>

          <div style={styles.actions}>
            <button
              onClick={() => navigate('/')}
              style={styles.primaryButton}
            >
              Seguir comprando
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              style={styles.secondaryButton}
            >
              Ir al Dashboard
            </button>
          </div>
        </section>
      </main>
    )
  }

  /*
   * ============================================
   * CHECKOUT
   * ============================================
   */

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <button
          onClick={() => navigate('/')}
          style={styles.logoButton}
        >
          SPORT<span>PHOTO</span>
        </button>

        <button
          onClick={() => navigate('/cart')}
          style={styles.backButton}
        >
          ← Volver al carrito
        </button>
      </header>

      <section style={styles.container}>
        <div style={styles.eyebrow}>
          CHECKOUT
        </div>

        <h1 style={styles.title}>
          Finalizar compra
        </h1>

        <p style={styles.subtitle}>
          Completa tus datos para registrar tu pedido.
        </p>

        {error && (
          <div style={styles.error}>
            <strong>
              No pudimos crear el pedido
            </strong>

            <span>{error}</span>
          </div>
        )}

        <div style={styles.layout}>
          <form
            onSubmit={createOrder}
            style={styles.form}
          >
            <section style={styles.card}>
              <div style={styles.cardEyebrow}>
                INFORMACIÓN DEL CLIENTE
              </div>

              <h2 style={styles.cardTitle}>
                Tus datos
              </h2>

              <div style={styles.fields}>
                <label style={styles.label}>
                  Nombre completo

                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateField(
                        'name',
                        event.target.value
                      )
                    }
                    placeholder="Nombre y apellido"
                    autoComplete="name"
                    required
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Correo electrónico

                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField(
                        'email',
                        event.target.value
                      )
                    }
                    placeholder="correo@ejemplo.com"
                    autoComplete="email"
                    required
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Teléfono / WhatsApp

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateField(
                        'phone',
                        event.target.value
                      )
                    }
                    placeholder="300 000 0000"
                    autoComplete="tel"
                    required
                    style={styles.input}
                  />
                </label>
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.cardEyebrow}>
                PAGO
              </div>

              <h2 style={styles.cardTitle}>
                Mercado Pago
              </h2>

              <div style={styles.paymentBox}>
                <div style={styles.paymentIcon}>
                  💳
                </div>

                <div>
                  <strong>
                    Pago seguro
                  </strong>

                  <p style={styles.paymentText}>
                    Primero registraremos el pedido.
                    Mercado Pago se conectará después.
                  </p>
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={creating}
              style={{
                ...styles.submitButton,
                opacity: creating ? 0.6 : 1,
              }}
            >
              {creating
                ? 'Creando pedido...'
                : 'Confirmar pedido'}

              {!creating && (
                <span>→</span>
              )}
            </button>
          </form>

          <aside style={styles.summary}>
            <div style={styles.cardEyebrow}>
              RESUMEN
            </div>

            <h2 style={styles.cardTitle}>
              Tu pedido
            </h2>

            <div style={styles.summaryItems}>
              {cart.map((item) => (
                <div
                  key={item.id}
                  style={styles.summaryItem}
                >
                  <div style={styles.summaryImage}>
                    {item.thumbnail_path ||
                    item.preview_path ||
                    item.file_path ? (
                      <img
                        src={
                          item.thumbnail_path ||
                          item.preview_path ||
                          item.file_path
                        }
                        alt=""
                        style={styles.summaryImageImg}
                      />
                    ) : (
                      '📸'
                    )}
                  </div>

                  <div style={styles.summaryInfo}>
                    <strong
                      style={styles.summaryName}
                    >
                      {item.file_name ||
                        'Fotografía'}
                    </strong>

                    <span
                      style={styles.summaryQuantity}
                    >
                      x{item.quantity || 1}
                    </span>
                  </div>

                  <strong>
                    {formatMoney(
                      Number(item.price || 0) *
                        Number(
                          item.quantity || 1
                        )
                    )}
                  </strong>
                </div>
              ))}
            </div>

            <div style={styles.divider} />

            <div style={styles.summaryRow}>
              <span>
                Fotografías
              </span>

              <strong>
                {totalItems}
              </strong>
            </div>

            <div style={styles.summaryRow}>
              <span>Subtotal</span>

              <strong>
                {formatMoney(subtotal)}
              </strong>
            </div>

            <div style={styles.summaryRow}>
              <span>Descuento</span>

              <strong>
                {formatMoney(discount)}
              </strong>
            </div>

            <div style={styles.divider} />

            <div style={styles.totalRow}>
              <span>Total</span>

              <strong>
                {formatMoney(total)}
              </strong>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#08090d',
    color: '#f5f5f7',
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  header: {
    minHeight: '76px',
    padding: '0 5%',
    borderBottom: '1px solid #20232b',
    background: '#0b0c10',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
  },

  logoButton: {
    border: 'none',
    background: 'transparent',
    color: '#f5f5f7',
    fontSize: '21px',
    fontWeight: '900',
    cursor: 'pointer',
  },

  backButton: {
    border: '1px solid #292e38',
    background: '#111319',
    color: '#d8dae0',
    borderRadius: '9px',
    padding: '9px 13px',
    cursor: 'pointer',
    fontSize: '12px',
  },

  container: {
    width: '90%',
    maxWidth: '1150px',
    margin: '0 auto',
    padding: '55px 0 90px',
  },

  eyebrow: {
    color: '#b8ff3d',
    fontSize: '10px',
    fontWeight: '900',
    letterSpacing: '1.8px',
  },

  title: {
    margin: '9px 0 0',
    fontSize: '44px',
    letterSpacing: '-1.8px',
  },

  subtitle: {
    margin: '12px 0 0',
    color: '#737a89',
    fontSize: '14px',
  },

  layout: {
    display: 'grid',
    gridTemplateColumns:
      'minmax(0, 1fr) 350px',
    gap: '25px',
    marginTop: '35px',
    alignItems: 'start',
  },

  form: {
    display: 'grid',
    gap: '16px',
  },

  card: {
    padding: '24px',
    background: '#101218',
    border: '1px solid #222630',
    borderRadius: '16px',
  },

  cardEyebrow: {
    color: '#b8ff3d',
    fontSize: '9px',
    fontWeight: '900',
    letterSpacing: '1.5px',
  },

  cardTitle: {
    margin: '7px 0 23px',
    fontSize: '21px',
  },

  fields: {
    display: 'grid',
    gap: '17px',
  },

  label: {
    display: 'grid',
    gap: '8px',
    color: '#9da2ad',
    fontSize: '11px',
    fontWeight: '650',
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 14px',
    borderRadius: '9px',
    border: '1px solid #2a2e38',
    outline: 'none',
    background: '#15181e',
    color: '#f2f3f5',
    fontSize: '13px',
  },

  paymentBox: {
    display: 'flex',
    gap: '13px',
    alignItems: 'flex-start',
    padding: '15px',
    borderRadius: '11px',
    background: '#15181e',
    border: '1px solid #292e38',
  },

  paymentIcon: {
    fontSize: '25px',
  },

  paymentText: {
    color: '#707787',
    fontSize: '11px',
    lineHeight: '1.5',
    margin: '6px 0 0',
  },

  submitButton: {
    width: '100%',
    padding: '15px',
    border: 'none',
    borderRadius: '10px',
    background: '#b8ff3d',
    color: '#08090d',
    fontWeight: '850',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  summary: {
    position: 'sticky',
    top: '20px',
    padding: '23px',
    borderRadius: '16px',
    background: '#101218',
    border: '1px solid #222630',
  },

  summaryItems: {
    display: 'grid',
    gap: '12px',
  },

  summaryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '11px',
  },

  summaryImage: {
    width: '43px',
    height: '43px',
    borderRadius: '7px',
    overflow: 'hidden',
    background: '#171a20',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },

  summaryImageImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  summaryInfo: {
    flex: 1,
    minWidth: 0,
    display: 'grid',
    gap: '4px',
  },

  summaryName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  summaryQuantity: {
    color: '#6f7685',
  },

  divider: {
    height: '1px',
    background: '#252932',
    margin: '19px 0',
  },

  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '15px',
    color: '#828896',
    fontSize: '12px',
    marginTop: '11px',
  },

  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '17px',
  },

  error: {
    marginTop: '22px',
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid #512a31',
    background: '#241418',
    color: '#ff9da8',
    display: 'grid',
    gap: '5px',
    fontSize: '12px',
  },

  center: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    gap: '10px',
  },

  logo: {
    fontSize: '21px',
    fontWeight: '900',
  },

  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid #252932',
    borderTop: '3px solid #b8ff3d',
    borderRadius: '50%',
    margin: '20px auto 5px',
  },

  loadingText: {
    color: '#737a89',
    fontSize: '13px',
  },

  successPage: {
    width: '90%',
    maxWidth: '650px',
    margin: '0 auto',
    padding: '100px 0',
    textAlign: 'center',
  },

  successIcon: {
    width: '70px',
    height: '70px',
    margin: '0 auto 25px',
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(184,255,61,.1)',
    border: '1px solid rgba(184,255,61,.25)',
    color: '#b8ff3d',
    fontSize: '30px',
    fontWeight: '900',
  },

  successTitle: {
    margin: '10px 0',
    fontSize: '35px',
  },

  successText: {
    color: '#777e8d',
    lineHeight: '1.7',
    fontSize: '14px',
  },

  orderBox: {
    marginTop: '30px',
    padding: '20px',
    borderRadius: '14px',
    background: '#101218',
    border: '1px solid #242832',
    textAlign: 'left',
  },

  orderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
    padding: '12px 0',
    borderBottom: '1px solid #20232b',
    color: '#7f8694',
    fontSize: '12px',
  },

  pending: {
    color: '#ffc45b',
  },

  paymentMessage: {
    color: '#666d7b',
    fontSize: '12px',
    lineHeight: '1.6',
  },

  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '25px',
    flexWrap: 'wrap',
  },

  primaryButton: {
    border: 'none',
    borderRadius: '9px',
    padding: '12px 16px',
    background: '#b8ff3d',
    color: '#08090d',
    fontWeight: '800',
    cursor: 'pointer',
  },

  secondaryButton: {
    border: '1px solid #292e38',
    borderRadius: '9px',
    padding: '12px 16px',
    background: '#111319',
    color: '#d8dae0',
    cursor: 'pointer',
  },
}