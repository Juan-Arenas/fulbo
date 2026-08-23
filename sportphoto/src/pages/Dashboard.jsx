import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])
  const [photos, setPhotos] = useState([])
  const [orders, setOrders] = useState([])
  const [orderItems, setOrderItems] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [orderSearch, setOrderSearch] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!currentUser) {
        navigate('/login')
        return
      }

      setUser(currentUser)

      /* =====================================================
         1. EVENTOS DEL FOTÓGRAFO
      ===================================================== */

      const {
        data: eventData,
        error: eventsError,
      } = await supabase
        .from('events')
        .select('*')
        .eq('photographer_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (eventsError) {
        throw eventsError
      }

      const safeEvents = eventData || []

      setEvents(safeEvents)

      const eventIds = safeEvents.map((event) => event.id)

      /* =====================================================
         SI NO HAY EVENTOS
      ===================================================== */

      if (eventIds.length === 0) {
        setPhotos([])
        setOrderItems([])
        setOrders([])
        return
      }

      /* =====================================================
         2. FOTOGRAFÍAS DE LOS EVENTOS
      ===================================================== */

      const {
        data: photoData,
        error: photosError,
      } = await supabase
        .from('photos')
        .select('*')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false })

      if (photosError) {
        throw photosError
      }

      const safePhotos = photoData || []

      setPhotos(safePhotos)

      const photoIds = safePhotos.map((photo) => photo.id)

      /* =====================================================
         SI NO HAY FOTOS
      ===================================================== */

      if (photoIds.length === 0) {
        setOrderItems([])
        setOrders([])
        return
      }

      /* =====================================================
         3. ITEMS DE LOS PEDIDOS
      ===================================================== */

      const {
        data: itemData,
        error: itemsError,
      } = await supabase
        .from('order_items')
        .select('*')
        .in('photo_id', photoIds)
        .order('created_at', { ascending: false })

      if (itemsError) {
        throw itemsError
      }

      const safeItems = itemData || []

      setOrderItems(safeItems)

      const orderIds = [
        ...new Set(
          safeItems
            .map((item) => item.order_id)
            .filter(Boolean)
        ),
      ]

      /* =====================================================
         SI NO HAY PEDIDOS
      ===================================================== */

      if (orderIds.length === 0) {
        setOrders([])
        return
      }

      /* =====================================================
         4. PEDIDOS
      ===================================================== */

      const {
        data: orderData,
        error: ordersError,
      } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds)
        .order('created_at', { ascending: false })

      if (ordersError) {
        throw ordersError
      }

      setOrders(orderData || [])
    } catch (err) {
      console.error('Error cargando dashboard:', err)

      setError(
        err?.message ||
          'No se pudo cargar la información del Dashboard.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch (err) {
      console.error('Error cerrando sesión:', err)
    }
  }

  function formatDate(date) {
    if (!date) return 'Sin fecha'

    const parsedDate = new Date(
      date.includes('T') ? date : `${date}T00:00:00`
    )

    if (Number.isNaN(parsedDate.getTime())) {
      return date
    }

    return parsedDate.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  function formatDateTime(date) {
    if (!date) return 'Sin fecha'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return date
    }

    return parsedDate.toLocaleString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatMoney(value) {
    const number = Number(value || 0)

    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(number)
  }

  function openEvent(eventId) {
    navigate(`/admin/events/${eventId}`)
  }

  function openOrders() {
    navigate('/admin/orders')
  }

  function getOrderStatus(order) {
    const paymentStatus = String(
      order?.payment_status || ''
    ).toLowerCase()

    const status = String(
      order?.status || ''
    ).toLowerCase()

    if (
      paymentStatus === 'approved' ||
      paymentStatus === 'paid' ||
      status === 'paid' ||
      status === 'completed'
    ) {
      return {
        label: 'Pagado',
        className: 'paid',
      }
    }

    if (
      paymentStatus === 'rejected' ||
      paymentStatus === 'cancelled' ||
      status === 'rejected' ||
      status === 'cancelled'
    ) {
      return {
        label:
          paymentStatus === 'cancelled' ||
          status === 'cancelled'
            ? 'Cancelado'
            : 'Rechazado',
        className: 'cancelled',
      }
    }

    return {
      label: 'Pendiente',
      className: 'pending',
    }
  }

  function getOrderItems(orderId) {
    return orderItems.filter(
      (item) => item.order_id === orderId
    )
  }

  function getPhoto(photoId) {
    return photos.find(
      (photo) => photo.id === photoId
    )
  }

  const paidOrders = useMemo(() => {
    return orders.filter((order) => {
      const paymentStatus = String(
        order?.payment_status || ''
      ).toLowerCase()

      const status = String(
        order?.status || ''
      ).toLowerCase()

      return (
        paymentStatus === 'approved' ||
        paymentStatus === 'paid' ||
        status === 'paid' ||
        status === 'completed'
      )
    })
  }, [orders])

  const totalSales = useMemo(() => {
    return paidOrders.reduce(
      (total, order) =>
        total + Number(order?.total || 0),
      0
    )
  }, [paidOrders])

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase()

    if (!query) {
      return orders.slice(0, 8)
    }

    return orders
      .filter((order) => {
        const id = String(order?.id || '').toLowerCase()
        const name = String(
          order?.customer_name || ''
        ).toLowerCase()
        const email = String(
          order?.customer_email || ''
        ).toLowerCase()
        const phone = String(
          order?.customer_phone || ''
        ).toLowerCase()
        const status = String(
          order?.status || ''
        ).toLowerCase()
        const paymentStatus = String(
          order?.payment_status || ''
        ).toLowerCase()

        return (
          id.includes(query) ||
          name.includes(query) ||
          email.includes(query) ||
          phone.includes(query) ||
          status.includes(query) ||
          paymentStatus.includes(query)
        )
      })
      .slice(0, 20)
  }, [orders, orderSearch])

  if (loading) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.loadingContent}>
          <div style={styles.logo}>
            SPORT<span>PHOTO</span>
          </div>

          <div style={styles.loader}></div>

          <p style={styles.loadingText}>
            Cargando tu panel...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={styles.page}>
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header style={styles.header}>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          style={styles.logoButton}
        >
          <div style={styles.logo}>
            SPORT<span>PHOTO</span>
          </div>
        </button>

        <div style={styles.headerRight}>
          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            style={styles.refreshButton}
          >
            {refreshing ? 'Actualizando...' : '↻ Actualizar'}
          </button>

          <div style={styles.userInfo}>
            <div style={styles.userLabel}>
              SESIÓN ACTIVA
            </div>

            <div style={styles.userEmail}>
              {user?.email || 'Usuario'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* =====================================================
          CONTENIDO
      ===================================================== */}

      <section style={styles.container}>
        {/* HERO */}

        <div style={styles.hero}>
          <div>
            <div style={styles.eyebrow}>
              PANEL DE FOTÓGRAFO
            </div>

            <h1 style={styles.title}>
              Mi Dashboard
            </h1>

            <p style={styles.subtitle}>
              Administra eventos, fotografías, pedidos
              y ventas desde un solo lugar.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate('/admin/events/new')
            }
            style={styles.createButton}
          >
            <span style={styles.plus}>+</span>
            Crear evento
          </button>
        </div>

        {/* =====================================================
            ESTADÍSTICAS REALES
        ===================================================== */}

        <section style={styles.statsGrid}>
          <StatCard
            label="Eventos"
            value={events.length}
            icon="◉"
          />

          <StatCard
            label="Fotografías"
            value={photos.length}
            icon="▣"
          />

          <StatCard
            label="Pedidos"
            value={orders.length}
            icon="◌"
          />

          <StatCard
            label="Ventas"
            value={formatMoney(totalSales)}
            icon="$"
          />
        </section>

        {/* ERROR */}

        {error && (
          <div style={styles.errorBox}>
            <div style={styles.errorIcon}>!</div>

            <div style={styles.errorContent}>
              <strong>
                No pudimos cargar toda la información
              </strong>

              <p style={styles.errorText}>
                {error}
              </p>

              <button
                type="button"
                onClick={() => loadDashboard()}
                style={styles.retryButton}
              >
                Intentar nuevamente
              </button>
            </div>
          </div>
        )}

        {/* =====================================================
            RESUMEN DE VENTAS
        ===================================================== */}

        <section style={styles.salesPanel}>
          <div>
            <div style={styles.panelEyebrow}>
              RESUMEN COMERCIAL
            </div>

            <h2 style={styles.panelTitle}>
              Tus ventas
            </h2>

            <p style={styles.panelDescription}>
              Información calculada directamente desde
              tus pedidos registrados.
            </p>
          </div>

          <div style={styles.salesStats}>
            <div style={styles.salesMiniCard}>
              <span style={styles.salesMiniLabel}>
                Pedidos pagados
              </span>

              <strong style={styles.salesMiniValue}>
                {paidOrders.length}
              </strong>
            </div>

            <div style={styles.salesMiniCard}>
              <span style={styles.salesMiniLabel}>
                Ventas confirmadas
              </span>

              <strong style={styles.salesMiniValue}>
                {formatMoney(totalSales)}
              </strong>
            </div>

            <button
              type="button"
              onClick={openOrders}
              style={styles.ordersButton}
            >
              Ver todos los pedidos →
            </button>
          </div>
        </section>

        {/* =====================================================
            PEDIDOS
        ===================================================== */}

        <section style={styles.ordersSection}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionEyebrow}>
                COMPRAS
              </div>

              <h2 style={styles.sectionTitle}>
                Pedidos recientes
              </h2>

              <p style={styles.sectionDescription}>
                Las compras asociadas a tus fotografías.
              </p>
            </div>

            <div style={styles.orderCount}>
              {orders.length} pedido
              {orders.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={styles.searchBox}>
            <span style={styles.searchIcon}>
              ⌕
            </span>

            <input
              type="text"
              value={orderSearch}
              onChange={(event) =>
                setOrderSearch(event.target.value)
              }
              placeholder="Buscar por cliente, correo, teléfono o ID..."
              style={styles.searchInput}
            />
          </div>

          {filteredOrders.length === 0 ? (
            <div style={styles.emptyOrders}>
              <div style={styles.emptyIcon}>
                🧾
              </div>

              <h3 style={styles.emptyTitle}>
                No hay pedidos todavía
              </h3>

              <p style={styles.emptyText}>
                Cuando alguien compre una de tus
                fotografías, aparecerá aquí.
              </p>
            </div>
          ) : (
            <div style={styles.ordersList}>
              {filteredOrders.map((order) => {
                const status =
                  getOrderStatus(order)

                const items =
                  getOrderItems(order.id)

                return (
                  <article
                    key={order.id}
                    style={styles.orderCard}
                  >
                    <div style={styles.orderMain}>
                      <div style={styles.orderCustomer}>
                        <div style={styles.customerAvatar}>
                          {(
                            order.customer_name ||
                            'C'
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <h3
                            style={
                              styles.customerName
                            }
                          >
                            {order.customer_name ||
                              'Cliente'}
                          </h3>

                          <div
                            style={
                              styles.customerContact
                            }
                          >
                            {order.customer_email ||
                              'Sin correo'}
                          </div>

                          {order.customer_phone && (
                            <div
                              style={
                                styles.customerContact
                              }
                            >
                              {order.customer_phone}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={styles.orderMeta}>
                        <div
                          style={
                            styles.orderDate
                          }
                        >
                          {formatDateTime(
                            order.created_at
                          )}
                        </div>

                        <div
                          style={{
                            ...styles.statusBadge,
                            ...(status.className ===
                            'paid'
                              ? styles.statusPaid
                              : status.className ===
                                'cancelled'
                              ? styles.statusCancelled
                              : styles.statusPending),
                          }}
                        >
                          {status.label}
                        </div>
                      </div>
                    </div>

                    <div
                      style={
                        styles.orderDivider
                      }
                    />

                    <div
                      style={
                        styles.orderBottom
                      }
                    >
                      <div
                        style={
                          styles.orderItemsPreview
                        }
                      >
                        <span
                          style={
                            styles.orderItemsIcon
                          }
                        >
                          📸
                        </span>

                        <span>
                          {items.length} foto
                          {items.length !== 1
                            ? 's'
                            : ''}{' '}
                          comprada
                          {items.length !== 1
                            ? 's'
                            : ''}
                        </span>
                      </div>

                      <div
                        style={
                          styles.orderFinancial
                        }
                      >
                        {Number(order.discount || 0) >
                          0 && (
                          <span
                            style={
                              styles.discountText
                            }
                          >
                            -{' '}
                            {formatMoney(
                              order.discount
                            )}
                          </span>
                        )}

                        <strong
                          style={
                            styles.orderTotal
                          }
                        >
                          {formatMoney(
                            order.total
                          )}
                        </strong>
                      </div>
                    </div>

                    {items.length > 0 && (
                      <div
                        style={
                          styles.orderPhotos
                        }
                      >
                        {items
                          .slice(0, 5)
                          .map((item) => {
                            const photo =
                              getPhoto(
                                item.photo_id
                              )

                            return (
                              <div
                                key={item.id}
                                style={
                                  styles.photoMini
                                }
                                title={
                                  photo?.file_name ||
                                  'Fotografía'
                                }
                              >
                                {photo?.thumbnail_path ||
                                photo?.preview_path ? (
                                  <img
                                    src={
                                      photo.thumbnail_path ||
                                      photo.preview_path
                                    }
                                    alt={
                                      photo?.file_name ||
                                      'Foto'
                                    }
                                    style={
                                      styles.photoMiniImage
                                    }
                                  />
                                ) : (
                                  <span>
                                    📸
                                  </span>
                                )}
                              </div>
                            )
                          })}

                        {items.length > 5 && (
                          <div
                            style={
                              styles.morePhotos
                            }
                          >
                            +{items.length - 5}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* =====================================================
            EVENTOS
        ===================================================== */}

        <section style={styles.eventsSection}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionEyebrow}>
                PORTAFOLIO
              </div>

              <h2 style={styles.sectionTitle}>
                Mis eventos
              </h2>

              <p style={styles.sectionDescription}>
                Administra tus eventos deportivos y
                fotografías.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('/admin/events/new')
              }
              style={styles.secondaryButton}
            >
              + Nuevo evento
            </button>
          </div>

          {events.length === 0 ? (
            <div style={styles.emptyEvents}>
              <div style={styles.emptyIcon}>
                📸
              </div>

              <h3 style={styles.emptyTitle}>
                Todavía no tienes eventos
              </h3>

              <p style={styles.emptyText}>
                Crea tu primer evento para comenzar
                a subir y vender fotografías.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate('/admin/events/new')
                }
                style={styles.createEmptyButton}
              >
                Crear mi primer evento
              </button>
            </div>
          ) : (
            <div style={styles.eventsGrid}>
              {events.map((event) => {
                const eventPhotos =
                  photos.filter(
                    (photo) =>
                      photo.event_id === event.id
                  )

                return (
                  <article
                    key={event.id}
                    style={styles.eventCard}
                  >
                    <div style={styles.cover}>
                      {event.cover_image ||
                      event.cover_url ||
                      event.image_url ? (
                        <img
                          src={
                            event.cover_image ||
                            event.cover_url ||
                            event.image_url
                          }
                          alt={
                            event.name ||
                            'Evento'
                          }
                          style={
                            styles.coverImage
                          }
                        />
                      ) : (
                        <div
                          style={
                            styles.coverPlaceholder
                          }
                        >
                          <div
                            style={
                              styles.cameraIcon
                            }
                          >
                            📸
                          </div>

                          <span>
                            SPORTPHOTO
                          </span>
                        </div>
                      )}

                      <div
                        style={
                          styles.photoCountBadge
                        }
                      >
                        📸 {eventPhotos.length}
                      </div>
                    </div>

                    <div
                      style={styles.eventBody}
                    >
                      <div
                        style={
                          styles.eventDate
                        }
                      >
                        {formatDate(
                          event.event_date
                        )}
                      </div>

                      <h3
                        style={
                          styles.eventName
                        }
                      >
                        {event.name ||
                          'Evento sin nombre'}
                      </h3>

                      {event.location && (
                        <div
                          style={
                            styles.location
                          }
                        >
                          <span>⌖</span>
                          {event.location}
                        </div>
                      )}

                      {event.description && (
                        <p
                          style={
                            styles.description
                          }
                        >
                          {event.description}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          openEvent(event.id)
                        }
                        style={
                          styles.manageButton
                        }
                      >
                        <span>
                          Gestionar evento
                        </span>

                        <span
                          style={
                            styles.arrow
                          }
                        >
                          →
                        </span>
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </section>

      {/* =====================================================
          RESPONSIVE
      ===================================================== */}

      <style>
        {`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          @media (max-width: 1000px) {
            .sportphoto-stats {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            .sportphoto-events {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }

          @media (max-width: 700px) {
            .sportphoto-header {
              flex-direction: column !important;
              align-items: flex-start !important;
              padding: 20px !important;
            }

            .sportphoto-header-right {
              width: 100% !important;
              flex-wrap: wrap !important;
            }

            .sportphoto-container {
              padding: 30px 18px 60px !important;
            }

            .sportphoto-hero {
              flex-direction: column !important;
              align-items: flex-start !important;
            }

            .sportphoto-stats {
              grid-template-columns: 1fr !important;
            }

            .sportphoto-events {
              grid-template-columns: 1fr !important;
            }

            .sportphoto-sales {
              flex-direction: column !important;
            }
          }
        `}
      </style>
    </main>
  )
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({ label, value, icon }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTop}>
        <span style={styles.statLabel}>
          {label}
        </span>

        <span style={styles.statIcon}>
          {icon}
        </span>
      </div>

      <div style={styles.statValue}>
        {value}
      </div>
    </div>
  )
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  page: {
    minHeight: '100vh',
    background: '#08090d',
    color: '#f5f5f7',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  loadingPage: {
    minHeight: '100vh',
    background: '#08090d',
    display: 'grid',
    placeItems: 'center',
    color: '#fff',
  },

  loadingContent: {
    textAlign: 'center',
  },

  logo: {
    fontSize: '20px',
    fontWeight: '900',
    letterSpacing: '-0.8px',
    color: '#f5f5f7',
  },

  logoSpan: {
    color: '#b8ff3d',
  },

  loader: {
    width: '28px',
    height: '28px',
    border: '3px solid #242832',
    borderTop: '3px solid #b8ff3d',
    borderRadius: '50%',
    margin: '25px auto 15px',
    animation: 'spin 1s linear infinite',
  },

  loadingText: {
    color: '#777d8d',
    fontSize: '14px',
  },

  header: {
    minHeight: '76px',
    padding: '0 5%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    borderBottom: '1px solid #20232b',
    background: '#0b0c10',
    boxSizing: 'border-box',
  },

  logoButton: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    cursor: 'pointer',
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },

  userInfo: {
    textAlign: 'right',
  },

  userLabel: {
    color: '#575d6b',
    fontSize: '9px',
    fontWeight: '800',
    letterSpacing: '1.2px',
  },

  userEmail: {
    color: '#bfc2ca',
    fontSize: '12px',
    marginTop: '4px',
  },

  refreshButton: {
    border: '1px solid #292e38',
    background: '#12151a',
    color: '#dfe1e5',
    borderRadius: '9px',
    padding: '9px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '650',
  },

  logoutButton: {
    border: '1px solid #292e38',
    background: '#12151a',
    color: '#dfe1e5',
    borderRadius: '9px',
    padding: '9px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '650',
  },

  container: {
    width: 'min(1200px, 90%)',
    margin: '0 auto',
    padding: '58px 0 80px',
  },

  hero: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '30px',
  },

  eyebrow: {
    color: '#b8ff3d',
    fontSize: '10px',
    fontWeight: '900',
    letterSpacing: '1.8px',
    textTransform: 'uppercase',
  },

  title: {
    margin: '9px 0 0',
    fontSize: '42px',
    lineHeight: '1.05',
    letterSpacing: '-1.8px',
    fontWeight: '850',
  },

  subtitle: {
    color: '#73798a',
    fontSize: '15px',
    margin: '15px 0 0',
    maxWidth: '620px',
    lineHeight: '1.6',
  },

  createButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '9px',
    padding: '14px 20px',
    border: 'none',
    borderRadius: '11px',
    background: '#b8ff3d',
    color: '#08090d',
    fontWeight: '850',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow:
      '0 8px 30px rgba(184,255,61,0.08)',
    whiteSpace: 'nowrap',
  },

  plus: {
    fontSize: '20px',
    lineHeight: 1,
    fontWeight: '400',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(4, minmax(0, 1fr))',
    gap: '14px',
    marginTop: '42px',
  },

  statCard: {
    background: '#101218',
    border: '1px solid #222630',
    borderRadius: '15px',
    padding: '20px 21px',
  },

  statTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statLabel: {
    color: '#73798a',
    fontSize: '12px',
    fontWeight: '600',
  },

  statIcon: {
    width: '28px',
    height: '28px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: '8px',
    background: '#171a21',
    color: '#b8ff3d',
    fontSize: '12px',
  },

  statValue: {
    fontSize: '30px',
    fontWeight: '800',
    marginTop: '12px',
    letterSpacing: '-1px',
  },

  errorBox: {
    marginTop: '24px',
    padding: '17px 18px',
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
    background: '#211317',
    border: '1px solid #4a252d',
    borderRadius: '13px',
    color: '#ff9ba7',
    boxSizing: 'border-box',
  },

  errorIcon: {
    width: '25px',
    height: '25px',
    flexShrink: 0,
    borderRadius: '50%',
    background: '#45212a',
    display: 'grid',
    placeItems: 'center',
    fontWeight: '900',
  },

  errorContent: {
    minWidth: 0,
  },

  errorText: {
    margin: '7px 0 10px',
    wordBreak: 'break-word',
    color: '#d88e98',
    fontSize: '13px',
    lineHeight: '1.5',
  },

  retryButton: {
    border: '1px solid #61303a',
    borderRadius: '8px',
    padding: '7px 11px',
    background: '#2b171c',
    color: '#ffb0b9',
    cursor: 'pointer',
  },

  salesPanel: {
    marginTop: '28px',
    padding: '25px',
    border: '1px solid #222630',
    borderRadius: '17px',
    background:
      'linear-gradient(135deg, #11141a 0%, #0d0f14 100%)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '25px',
  },

  panelEyebrow: {
    color: '#b8ff3d',
    fontSize: '9px',
    fontWeight: '900',
    letterSpacing: '1.5px',
  },

  panelTitle: {
    margin: '7px 0 0',
    fontSize: '22px',
    letterSpacing: '-0.5px',
  },

  panelDescription: {
    color: '#666d7c',
    fontSize: '13px',
    margin: '8px 0 0',
  },

  salesStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },

  salesMiniCard: {
    minWidth: '145px',
    padding: '13px 15px',
    borderRadius: '11px',
    background: '#171a20',
    border: '1px solid #262a34',
  },

  salesMiniLabel: {
    display: 'block',
    color: '#707687',
    fontSize: '10px',
    fontWeight: '700',
  },

  salesMiniValue: {
    display: 'block',
    marginTop: '6px',
    fontSize: '17px',
    fontWeight: '800',
  },

  ordersButton: {
    border: '1px solid #303640',
    background: '#15181e',
    color: '#e9ebee',
    borderRadius: '10px',
    padding: '12px 15px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
  },

  ordersSection: {
    marginTop: '48px',
  },

  eventsSection: {
    marginTop: '54px',
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '20px',
  },

  sectionEyebrow: {
    color: '#b8ff3d',
    fontSize: '9px',
    fontWeight: '900',
    letterSpacing: '1.5px',
  },

  sectionTitle: {
    margin: '7px 0 0',
    fontSize: '24px',
    letterSpacing: '-0.7px',
  },

  sectionDescription: {
    margin: '7px 0 0',
    color: '#666d7c',
    fontSize: '13px',
  },

  orderCount: {
    color: '#777e8c',
    fontSize: '12px',
    fontWeight: '650',
  },

  searchBox: {
    marginTop: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid #272b34',
    background: '#101218',
    borderRadius: '11px',
    padding: '0 14px',
  },

  searchIcon: {
    color: '#777e8c',
    fontSize: '20px',
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#f1f2f4',
    padding: '13px 0',
    fontSize: '13px',
  },

  ordersList: {
    display: 'grid',
    gap: '12px',
    marginTop: '15px',
  },

  orderCard: {
    background: '#101218',
    border: '1px solid #222630',
    borderRadius: '14px',
    padding: '17px',
  },

  orderMain: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
  },

  orderCustomer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
  },

  customerAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#1c2028',
    color: '#b8ff3d',
    display: 'grid',
    placeItems: 'center',
    fontWeight: '850',
    flexShrink: 0,
  },

  customerName: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '750',
  },

  customerContact: {
    marginTop: '3px',
    color: '#707787',
    fontSize: '11px',
  },

  orderMeta: {
    textAlign: 'right',
    flexShrink: 0,
  },

  orderDate: {
    color: '#6f7685',
    fontSize: '10px',
    marginBottom: '7px',
  },

  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '999px',
    padding: '5px 9px',
    fontSize: '10px',
    fontWeight: '800',
  },

  statusPaid: {
    background: 'rgba(184,255,61,0.10)',
    color: '#b8ff3d',
    border: '1px solid rgba(184,255,61,0.20)',
  },

  statusPending: {
    background: 'rgba(255,190,60,0.08)',
    color: '#ffc65a',
    border: '1px solid rgba(255,190,60,0.16)',
  },

  statusCancelled: {
    background: 'rgba(255,80,100,0.08)',
    color: '#ff8e9d',
    border: '1px solid rgba(255,80,100,0.16)',
  },

  orderDivider: {
    height: '1px',
    background: '#20232b',
    margin: '15px 0',
  },

  orderBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '15px',
  },

  orderItemsPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    color: '#777e8d',
    fontSize: '11px',
  },

  orderItemsIcon: {
    fontSize: '13px',
  },

  orderFinancial: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  discountText: {
    color: '#7c8492',
    fontSize: '11px',
  },

  orderTotal: {
    color: '#f5f5f7',
    fontSize: '15px',
  },

  orderPhotos: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginTop: '13px',
  },

  photoMini: {
    width: '34px',
    height: '34px',
    borderRadius: '7px',
    overflow: 'hidden',
    background: '#171a20',
    border: '1px solid #272b34',
    display: 'grid',
    placeItems: 'center',
    color: '#666d7c',
    fontSize: '12px',
  },

  photoMiniImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  morePhotos: {
    width: '34px',
    height: '34px',
    borderRadius: '7px',
    display: 'grid',
    placeItems: 'center',
    background: '#171a20',
    border: '1px solid #272b34',
    color: '#8a909d',
    fontSize: '10px',
    fontWeight: '750',
  },

  emptyOrders: {
    marginTop: '15px',
    padding: '55px 20px',
    textAlign: 'center',
    background: '#101218',
    border: '1px solid #222630',
    borderRadius: '15px',
  },

  emptyEvents: {
    marginTop: '24px',
    padding: '70px 20px',
    textAlign: 'center',
    background: '#101218',
    border: '1px solid #222630',
    borderRadius: '17px',
  },

  emptyIcon: {
    fontSize: '35px',
    opacity: 0.8,
  },

  emptyTitle: {
    margin: '15px 0 0',
    fontSize: '17px',
  },

  emptyText: {
    color: '#666d7c',
    fontSize: '13px',
    lineHeight: '1.6',
    maxWidth: '430px',
    margin: '8px auto 0',
  },

  createEmptyButton: {
    marginTop: '20px',
    border: 'none',
    background: '#b8ff3d',
    color: '#08090d',
    borderRadius: '9px',
    padding: '11px 15px',
    cursor: 'pointer',
    fontWeight: '800',
    fontSize: '12px',
  },

  secondaryButton: {
    border: '1px solid #303640',
    background: '#15181e',
    color: '#e9ebee',
    borderRadius: '9px',
    padding: '10px 13px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
  },

  eventsGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(3, minmax(0, 1fr))',
    gap: '18px',
    marginTop: '24px',
  },

  eventCard: {
    overflow: 'hidden',
    background: '#101218',
    border: '1px solid #222630',
    borderRadius: '17px',
    boxSizing: 'border-box',
  },

  cover: {
    height: '185px',
    background: '#15171d',
    overflow: 'hidden',
    position: 'relative',
  },

  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },

  coverPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '7px',
    background:
      'radial-gradient(circle at center, #20242d 0%, #111319 65%)',
    color: '#454b59',
    fontSize: '9px',
    letterSpacing: '2px',
    fontWeight: '800',
  },

  cameraIcon: {
    fontSize: '35px',
    opacity: 0.65,
  },

  photoCountBadge: {
    position: 'absolute',
    right: '10px',
    bottom: '10px',
    padding: '6px 9px',
    borderRadius: '999px',
    background: 'rgba(8,9,13,0.78)',
    backdropFilter: 'blur(8px)',
    color: '#fff',
    fontSize: '10px',
    fontWeight: '750',
    border: '1px solid rgba(255,255,255,0.08)',
  },

  eventBody: {
    padding: '20px',
  },

  eventDate: {
    color: '#b8ff3d',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '1.3px',
    fontWeight: '900',
    marginBottom: '9px',
  },

  eventName: {
    margin: 0,
    fontSize: '21px',
    lineHeight: '1.25',
    letterSpacing: '-0.5px',
    fontWeight: '750',
  },

  location: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '11px',
    color: '#858b99',
    fontSize: '13px',
  },

  description: {
    color: '#656b7a',
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '12px 0 0',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },

  manageButton: {
    width: '100%',
    marginTop: '20px',
    padding: '12px 13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    border: '1px solid #292e38',
    borderRadius: '9px',
    background: '#15171d',
    color: '#e7e8eb',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '650',
    boxSizing: 'border-box',
  },

  arrow: {
    color: '#b8ff3d',
    fontSize: '18px',
  },
}