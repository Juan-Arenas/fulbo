import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CartCheckout({
  event,
  selectedPhotos,
  onBack,
  onRemove,
  onClear,
}) {
  const navigate = useNavigate()

  const [step, setStep] = useState('cart')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
  })

  const subtotal = useMemo(() => {
    return selectedPhotos.reduce(
      (sum, photo) =>
        sum + Number(photo.price || 0),
      0
    )
  }, [selectedPhotos])

  const discount = useMemo(() => {
    const quantity =
      selectedPhotos.length

    if (quantity >= 10) {
      return subtotal * 0.2
    }

    if (quantity >= 5) {
      return subtotal * 0.1
    }

    if (quantity >= 3) {
      return subtotal * 0.05
    }

    return 0
  }, [
    selectedPhotos,
    subtotal,
  ])

  const total =
    subtotal - discount

  function formatPrice(value) {
    return `$${Number(
      value || 0
    ).toLocaleString('es-CO')}`
  }

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target

    setCustomer((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function continueCheckout() {
    setError('')

    if (
      selectedPhotos.length === 0
    ) {
      setError(
        'Selecciona al menos una fotografía.'
      )
      return
    }

    setStep('checkout')
  }

  async function createOrderAndPay() {
    setError('')

    if (!customer.name.trim()) {
      setError(
        'Escribe tu nombre completo.'
      )
      return
    }

    if (!customer.email.trim()) {
      setError(
        'Escribe tu correo electrónico.'
      )
      return
    }

    if (!customer.phone.trim()) {
      setError(
        'Escribe tu número de WhatsApp.'
      )
      return
    }

    if (
      selectedPhotos.length === 0
    ) {
      setError(
        'No hay fotografías seleccionadas.'
      )
      return
    }

    setLoading(true)

    try {
      /*
       * 1. Crear pedido en Supabase
       */

      const {
        data: order,
        error: orderError,
      } = await supabase
        .from('orders')
        .insert({
          event_id: event.id,
          customer_name:
            customer.name.trim(),
          customer_email:
            customer.email.trim(),
          customer_phone:
            customer.phone.trim(),
          subtotal,
          discount,
          total,
          status: 'pending',
          payment_status:
            'pending',
        })
        .select()
        .single()

      if (orderError) {
        throw orderError
      }

      /*
       * 2. Crear items
       */

      const orderItems =
        selectedPhotos.map(
          (photo) => ({
            order_id: order.id,
            photo_id: photo.id,
            price: Number(
              photo.price || 0
            ),
          })
        )

      const {
        error: itemsError,
      } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        throw itemsError
      }

      /*
       * 3. Llamar a nuestra Edge Function
       */

      const {
        data: paymentData,
        error: functionError,
      } =
        await supabase.functions.invoke(
          'create-payment',
          {
            body: {
              order_id: order.id,
            },
          }
        )

      if (functionError) {
        throw functionError
      }

      if (
        !paymentData?.init_point
      ) {
        throw new Error(
          paymentData?.error ||
            'Mercado Pago no devolvió la URL de pago.'
        )
      }

      /*
       * 4. Ir a Mercado Pago
       */

      window.location.href =
        paymentData.init_point
    } catch (err) {
      console.error(err)

      setError(
        err?.message ||
          'No pudimos iniciar el pago.'
      )

      setLoading(false)
    }
  }

  /*
   * CARRITO
   */

  if (step === 'cart') {
    return (
      <main style={styles.page}>
        <header style={styles.header}>
          <button
            type="button"
            onClick={onBack}
            style={styles.backButton}
          >
            ← Volver
          </button>

          <div style={styles.logo}>
            SPORT
            <span>PHOTO</span>
          </div>

          <div style={styles.spacer} />
        </header>

        <section style={styles.container}>

          <div style={styles.eyebrow}>
            TU SELECCIÓN
          </div>

          <h1 style={styles.title}>
            Tu carrito
          </h1>

          <p style={styles.subtitle}>
            {event?.name ||
              'Evento deportivo'}
          </p>

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          {selectedPhotos.length ===
          0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                🛒
              </div>

              <h2>
                Tu carrito está vacío
              </h2>

              <button
                type="button"
                onClick={onBack}
                style={
                  styles.primaryButton
                }
              >
                Volver a la galería
              </button>
            </div>
          ) : (
            <div style={styles.layout}>

              <section
                style={styles.items}
              >
                {selectedPhotos.map(
                  (photo) => (
                    <article
                      key={photo.id}
                      style={styles.item}
                    >
                      <div
                        style={
                          styles.imageBox
                        }
                      >
                        {photo.url && (
                          <img
                            src={photo.url}
                            alt=""
                            style={
                              styles.image
                            }
                          />
                        )}
                      </div>

                      <div
                        style={
                          styles.itemInfo
                        }
                      >
                        <strong>
                          {photo.dorsal
                            ? `Dorsal ${photo.dorsal}`
                            : 'Fotografía'}
                        </strong>

                        <span>
                          {photo.participant_name ||
                            photo.file_name ||
                            ''}
                        </span>
                      </div>

                      <div
                        style={
                          styles.itemRight
                        }
                      >
                        <strong>
                          {formatPrice(
                            photo.price
                          )}
                        </strong>

                        <button
                          type="button"
                          onClick={() =>
                            onRemove(
                              photo.id
                            )
                          }
                          style={
                            styles.remove
                          }
                        >
                          Quitar
                        </button>
                      </div>
                    </article>
                  )
                )}
              </section>

              <aside
                style={styles.summary}
              >
                <h2>
                  Resumen
                </h2>

                <div
                  style={
                    styles.row
                  }
                >
                  <span>
                    Fotografías
                  </span>

                  <span>
                    {
                      selectedPhotos.length
                    }
                  </span>
                </div>

                <div
                  style={
                    styles.row
                  }
                >
                  <span>
                    Subtotal
                  </span>

                  <span>
                    {formatPrice(
                      subtotal
                    )}
                  </span>
                </div>

                {discount > 0 && (
                  <div
                    style={
                      styles.discount
                    }
                  >
                    <span>
                      Descuento
                    </span>

                    <strong>
                      -
                      {formatPrice(
                        discount
                      )}
                    </strong>
                  </div>
                )}

                <div
                  style={
                    styles.divider
                  }
                />

                <div
                  style={
                    styles.totalRow
                  }
                >
                  <span>
                    Total
                  </span>

                  <strong>
                    {formatPrice(
                      total
                    )}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={
                    continueCheckout
                  }
                  style={
                    styles.primaryButton
                  }
                >
                  Continuar
                </button>
              </aside>

            </div>
          )}
        </section>
      </main>
    )
  }

  /*
   * CHECKOUT
   */

  return (
    <main style={styles.page}>

      <header style={styles.header}>

        <button
          type="button"
          onClick={() =>
            setStep('cart')
          }
          style={styles.backButton}
        >
          ← Volver
        </button>

        <div style={styles.logo}>
          SPORT
          <span>PHOTO</span>
        </div>

        <div style={styles.spacer} />

      </header>

      <section style={styles.container}>

        <div style={styles.eyebrow}>
          CHECKOUT
        </div>

        <h1 style={styles.title}>
          Datos de compra
        </h1>

        <p style={styles.subtitle}>
          Completa tus datos para
          continuar con Mercado Pago.
        </p>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <div style={styles.layout}>

          <section
            style={styles.formCard}
          >

            <h2>
              Información del comprador
            </h2>

            <label style={styles.label}>
              Nombre completo

              <input
                name="name"
                value={customer.name}
                onChange={handleChange}
                placeholder="Juan Pérez"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Correo electrónico

              <input
                type="email"
                name="email"
                value={customer.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.com"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              WhatsApp

              <input
                type="tel"
                name="phone"
                value={customer.phone}
                onChange={handleChange}
                placeholder="+57 300 000 0000"
                style={styles.input}
              />
            </label>

            <div
              style={
                styles.mercadoNotice
              }
            >
              <strong>
                💳 Mercado Pago
              </strong>

              <span>
                Serás redirigido a
                Mercado Pago para
                realizar el pago de
                forma segura.
              </span>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={
                createOrderAndPay
              }
              style={{
                ...styles.primaryButton,
                opacity: loading
                  ? 0.6
                  : 1,
              }}
            >
              {loading
                ? 'Preparando pago...'
                : `Pagar ${formatPrice(
                    total
                  )}`}
            </button>

          </section>

          <aside
            style={styles.summary}
          >

            <h2>
              Tu pedido
            </h2>

            {selectedPhotos.map(
              (photo) => (
                <div
                  key={photo.id}
                  style={styles.miniItem}
                >
                  <span>
                    {photo.dorsal
                      ? `Dorsal ${photo.dorsal}`
                      : 'Fotografía'}
                  </span>

                  <strong>
                    {formatPrice(
                      photo.price
                    )}
                  </strong>
                </div>
              )
            )}

            <div
              style={
                styles.divider
              }
            />

            <div
              style={styles.row}
            >
              <span>
                Subtotal
              </span>

              <span>
                {formatPrice(
                  subtotal
                )}
              </span>
            </div>

            {discount > 0 && (
              <div
                style={
                  styles.discount
                }
              >
                <span>
                  Descuento
                </span>

                <strong>
                  -
                  {formatPrice(
                    discount
                  )}
                </strong>
              </div>
            )}

            <div
              style={
                styles.totalRow
              }
            >
              <span>
                Total
              </span>

              <strong>
                {formatPrice(
                  total
                )}
              </strong>
            </div>

          </aside>

        </div>
      </section>
    </main>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#08090d',
    color: '#f5f5f7',
    fontFamily:
      'Inter, system-ui, sans-serif',
    paddingBottom: '60px',
  },

  header: {
    height: '76px',
    padding: '0 5%',
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    borderBottom:
      '1px solid #20232b',
    background: '#0b0c10',
  },

  logo: {
    fontSize: '21px',
    fontWeight: '900',
  },

  backButton: {
    border: 'none',
    background: 'transparent',
    color: '#888e9c',
    cursor: 'pointer',
    fontSize: '13px',
  },

  spacer: {
    width: '60px',
  },

  container: {
    width: '90%',
    maxWidth: '1150px',
    margin: '0 auto',
    padding: '55px 0',
  },

  eyebrow: {
    color: '#b8ff3d',
    fontSize: '10px',
    fontWeight: '900',
    letterSpacing: '2px',
    marginBottom: '12px',
  },

  title: {
    margin: 0,
    fontSize: 'clamp(35px, 5vw, 55px)',
    letterSpacing: '-2px',
  },

  subtitle: {
    color: '#727886',
    fontSize: '14px',
    marginBottom: '35px',
  },

  layout: {
    display: 'grid',
    gridTemplateColumns:
      'minmax(0, 1fr) 340px',
    gap: '25px',
    alignItems: 'start',
  },

  items: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  item: {
    display: 'grid',
    gridTemplateColumns:
      '110px minmax(0, 1fr) auto',
    gap: '15px',
    alignItems: 'center',
    padding: '12px',
    background: '#101218',
    border:
      '1px solid #252933',
    borderRadius: '12px',
  },

  imageBox: {
    width: '110px',
    height: '80px',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#181b21',
  },

  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  itemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },

  itemInfoSpan: {
    color: '#737988',
    fontSize: '11px',
  },

  itemRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
  },

  remove: {
    border: 'none',
    background: 'transparent',
    color: '#777d8d',
    cursor: 'pointer',
    fontSize: '11px',
  },

  summary: {
    background: '#101218',
    border:
      '1px solid #252933',
    borderRadius: '14px',
    padding: '22px',
    position: 'sticky',
    top: '95px',
  },

  row: {
    display: 'flex',
    justifyContent:
      'space-between',
    color: '#858b98',
    fontSize: '13px',
    marginTop: '15px',
  },

  discount: {
    display: 'flex',
    justifyContent:
      'space-between',
    color: '#b8ff3d',
    fontSize: '13px',
    marginTop: '15px',
  },

  divider: {
    height: '1px',
    background: '#292d36',
    margin: '20px 0',
  },

  totalRow: {
    display: 'flex',
    justifyContent:
      'space-between',
    fontSize: '17px',
    marginBottom: '20px',
  },

  primaryButton: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '9px',
    background: '#b8ff3d',
    color: '#08090d',
    fontWeight: '900',
    cursor: 'pointer',
    fontSize: '13px',
  },

  empty: {
    textAlign: 'center',
    padding: '80px 20px',
    border:
      '1px dashed #30343d',
    borderRadius: '15px',
  },

  emptyIcon: {
    fontSize: '40px',
    marginBottom: '15px',
  },

  error: {
    marginBottom: '20px',
    padding: '13px 15px',
    border:
      '1px solid #632a33',
    background: '#28151a',
    color: '#ffadb7',
    borderRadius: '9px',
    fontSize: '13px',
  },

  formCard: {
    background: '#101218',
    border:
      '1px solid #252933',
    borderRadius: '14px',
    padding: '28px',
  },

  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    color: '#b9bdc5',
    fontSize: '12px',
    fontWeight: '700',
    marginTop: '22px',
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '14px',
    border:
      '1px solid #30343d',
    borderRadius: '9px',
    background: '#0b0d11',
    color: '#fff',
    outline: 'none',
    fontSize: '13px',
  },

  mercadoNotice: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    margin: '25px 0',
    padding: '15px',
    border:
      '1px solid #30352b',
    background: '#141810',
    borderRadius: '10px',
    fontSize: '12px',
  },

  miniItem: {
    display: 'flex',
    justifyContent:
      'space-between',
    gap: '10px',
    padding: '8px 0',
    color: '#858b98',
    fontSize: '12px',
  },
}