import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PublicEvent() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState([])
  const [filteredPhotos, setFilteredPhotos] = useState([])

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  const [showCart, setShowCart] = useState(false)
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('sportphoto_cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    loadEvent()
  }, [id])

  useEffect(() => {
    const value = search.trim().toLowerCase()

    if (!value) {
      setFilteredPhotos(photos)
      return
    }

    const results = photos.filter((photo) => {
      const fileName =
        photo.file_name?.toLowerCase() || ''

      const dorsal =
        String(photo.dorsal || '').toLowerCase()

      const participantName =
        photo.participant_name?.toLowerCase() || ''

      return (
        fileName.includes(value) ||
        dorsal.includes(value) ||
        participantName.includes(value)
      )
    })

    setFilteredPhotos(results)
  }, [search, photos])

  async function loadEvent() {
    setLoading(true)
    setError('')

    try {
      const {
        data: eventData,
        error: eventError,
      } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()

      if (eventError) {
        throw eventError
      }

      setEvent(eventData)

      const {
        data: photoData,
        error: photoError,
      } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', id)
        .eq('active', true)
        .order('created_at', {
          ascending: false,
        })

      if (photoError) {
        throw photoError
      }

      const photosWithUrls = await Promise.all(
        (photoData || []).map(async (photo) => {
          if (!photo.file_path) {
            return {
              ...photo,
              url: null,
            }
          }

          const {
            data,
            error: urlError,
          } = await supabase.storage
            .from('event-photos')
            .createSignedUrl(
              photo.file_path,
              3600
            )

          if (urlError) {
            console.warn(
              'No se pudo generar la URL:',
              urlError
            )
          }

          return {
            ...photo,
            url: data?.signedUrl || null,
          }
        })
      )

      setPhotos(photosWithUrls)
      setFilteredPhotos(photosWithUrls)
    } catch (err) {
      console.error(err)

      setError(
        err?.message ||
          'No se pudo cargar el evento.'
      )
    } finally {
      setLoading(false)
    }
  }

  function saveCart(items) {
    setCartItems(items)
    localStorage.setItem(
      'sportphoto_cart',
      JSON.stringify(items)
    )
    window.dispatchEvent(
      new Event('sportphoto-cart-updated')
    )
  }

  function addToCart(photo) {
    setSelectedPhotos((current) => {
      if (current.some((item) => item.id === photo.id)) {
        return current
      }
      return [...current, photo]
    })

    const existing = cartItems.find(
      (item) => item.id === photo.id
    )

    if (existing) {
      navigate('/cart')
      return
    }

    const item = {
      id: photo.id,
      event_id: photo.event_id || id,
      file_path: photo.file_path || null,
      preview_path: photo.preview_path || null,
      thumbnail_path: photo.thumbnail_path || null,
      file_name: photo.file_name || 'Fotografía',
      dorsal: photo.dorsal || '',
      participant_name: photo.participant_name || '',
      price: Number(photo.price || 0),
      quantity: 1,
      url: photo.url || null,
    }

    saveCart([...cartItems, item])
  }

  function removeFromCart(photoId) {
    const next = cartItems.filter(
      (item) => item.id !== photoId
    )
    saveCart(next)
    setSelectedPhotos((current) =>
      current.filter((photo) => photo.id !== photoId)
    )
  }

  function clearCart() {
    saveCart([])
    setSelectedPhotos([])
  }

  function togglePhoto(photo) {
    const alreadyInCart = cartItems.some(
      (item) => item.id === photo.id
    )

    if (alreadyInCart) {
      removeFromCart(photo.id)
      return
    }

    addToCart(photo)
  }

  function isSelected(photoId) {
    return selectedPhotos.some(
      (photo) => photo.id === photoId
    )
  }

  function getPrice(photo) {
    return Number(photo.price || 0)
  }

  const total = selectedPhotos.reduce(
    (sum, photo) =>
      sum + getPrice(photo),
    0
  )

  function formatPrice(value) {
    return `$${Number(
      value || 0
    ).toLocaleString('es-CO')}`
  }

  function openCart() {
    if (cartItems.length === 0) return
    navigate('/cart')
  }

  /*
   * CARRITO / CHECKOUT
   */

  /*
   * CARGANDO
   */

  if (loading) {
    return (
      <main style={styles.loading}>
        <div>
          <div style={styles.logo}>
            SPORT<span>PHOTO</span>
          </div>

          <div style={styles.loader} />

          <p style={styles.loadingText}>
            Cargando fotografías...
          </p>
        </div>
      </main>
    )
  }

  /*
   * ERROR
   */

  if (error || !event) {
    return (
      <main style={styles.loading}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>
            !
          </div>

          <h1 style={styles.errorTitle}>
            Evento no encontrado
          </h1>

          <p style={styles.errorMessage}>
            {error ||
              'No encontramos este evento.'}
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={styles.page}>

      {/* HEADER */}

      <header style={styles.header}>
        <div style={styles.logo}>
          SPORT<span>PHOTO</span>
        </div>

        {cartItems.length > 0 && (
          <button
            type="button"
            style={styles.cartButton}
            onClick={openCart}
          >
            <span>
              🛒 {cartItems.length}{' '}
              {cartItems.length === 1
                ? 'foto'
                : 'fotos'}
            </span>

            <strong>
              {formatPrice(total)}
            </strong>
          </button>
        )}
      </header>

      {/* HERO */}

      <section style={styles.hero}>
        <div style={styles.heroContent}>

          <div style={styles.eyebrow}>
            GALERÍA OFICIAL
          </div>

          <h1 style={styles.title}>
            {event.name ||
              'Evento deportivo'}
          </h1>

          <div style={styles.meta}>
            {event.event_date && (
              <span>
                📅 {event.event_date}
              </span>
            )}

            {event.location && (
              <span>
                📍 {event.location}
              </span>
            )}
          </div>

          <p style={styles.subtitle}>
            Encuentra tus fotografías
            deportivas de forma rápida.
          </p>

          {/* BUSCADOR */}

          <div style={styles.searchWrapper}>

            <span style={styles.searchIcon}>
              🔎
            </span>

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Busca por dorsal, nombre o archivo..."
              style={styles.searchInput}
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch('')
                }
                style={styles.clearButton}
              >
                ×
              </button>
            )}

          </div>
        </div>
      </section>

      {/* GALERÍA */}

      <section style={styles.gallery}>

        <div style={styles.galleryHeader}>

          <div>
            <h2 style={styles.galleryTitle}>
              Fotografías
            </h2>

            <p style={styles.galleryDescription}>
              {filteredPhotos.length}{' '}
              {filteredPhotos.length === 1
                ? 'fotografía'
                : 'fotografías'}{' '}
              disponibles
            </p>
          </div>

          {cartItems.length > 0 && (
            <div style={styles.selectionInfo}>
              {cartItems.length}{' '}
              en carrito ·{' '}
              {formatPrice(cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0))}
            </div>
          )}

        </div>

        {/* SIN RESULTADOS */}

        {filteredPhotos.length === 0 ? (

          <div style={styles.empty}>

            <div style={styles.emptyIcon}>
              🔎
            </div>

            <h3 style={styles.emptyTitle}>
              No encontramos fotografías
            </h3>

            <p style={styles.emptyText}>
              Prueba con otro dorsal,
              nombre o término de búsqueda.
            </p>

          </div>

        ) : (

          <div style={styles.photoGrid}>

            {filteredPhotos.map((photo) => {

              const selected =
                cartItems.some((item) => item.id === photo.id)

              return (
                <article
                  key={photo.id}
                  style={{
                    ...styles.card,
                    ...(selected
                      ? styles.selectedCard
                      : {}),
                  }}
                >

                  {/* FOTO */}

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPhoto(photo)
                    }
                    style={styles.imageButton}
                  >

                    {photo.url ? (

                      <img
                        src={photo.url}
                        alt={
                          photo.file_name ||
                          'Fotografía deportiva'
                        }
                        style={styles.image}
                      />

                    ) : (

                      <div style={styles.noImage}>
                        Sin imagen
                      </div>

                    )}

                    <div style={styles.zoomBadge}>
                      ⤢
                    </div>

                  </button>

                  {/* INFORMACIÓN */}

                  <div style={styles.cardInfo}>

                    <div>

                      <div style={styles.cardTitle}>
                        {photo.dorsal
                          ? `Dorsal ${photo.dorsal}`
                          : photo.file_name ||
                            'Fotografía'}
                      </div>

                      {photo.participant_name && (
                        <div
                          style={
                            styles.participant
                          }
                        >
                          {
                            photo.participant_name
                          }
                        </div>
                      )}

                    </div>

                    <div style={styles.cardBottom}>

                      <strong style={styles.price}>
                        {formatPrice(
                          getPrice(photo)
                        )}
                      </strong>

                      <button
                        type="button"
                        onClick={() =>
                          togglePhoto(photo)
                        }
                        style={{
                          ...styles.selectButton,
                          ...(selected
                            ? styles.selectedButton
                            : {}),
                        }}
                      >
                        {selected
                          ? '✓ Seleccionada'
                          : 'Seleccionar'}
                      </button>

                    </div>
                  </div>
                </article>
              )
            })}

          </div>
        )}
      </section>

      {/* MODAL */}

      {selectedPhoto && (

        <div
          style={styles.modalOverlay}
          onClick={() =>
            setSelectedPhoto(null)
          }
        >

          <div
            style={styles.modal}
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              type="button"
              onClick={() =>
                setSelectedPhoto(null)
              }
              style={styles.modalClose}
            >
              ×
            </button>

            {selectedPhoto.url && (
              <img
                src={selectedPhoto.url}
                alt={
                  selectedPhoto.file_name ||
                  'Fotografía'
                }
                style={styles.modalImage}
              />
            )}

            <div style={styles.modalInfo}>

              <div>

                <h3 style={styles.modalTitle}>
                  {selectedPhoto.dorsal
                    ? `Dorsal ${selectedPhoto.dorsal}`
                    : 'Fotografía'}
                </h3>

                <p style={styles.modalText}>
                  {selectedPhoto.participant_name ||
                    selectedPhoto.file_name ||
                    'Fotografía deportiva'}
                </p>

              </div>

              <div style={styles.modalActions}>

                <strong style={styles.modalPrice}>
                  {formatPrice(
                    getPrice(selectedPhoto)
                  )}
                </strong>

                <button
                  type="button"
                  onClick={() => {
                    togglePhoto(selectedPhoto)
                    setSelectedPhoto(null)
                  }}
                  style={styles.modalSelect}
                >
                  {isSelected(
                    selectedPhoto.id
                  )
                    ? 'Quitar de selección'
                    : 'Seleccionar foto'}
                </button>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* CARRITO FLOTANTE */}

      {cartItems.length > 0 && (

        <div style={styles.bottomCart}>

          <div style={styles.bottomCartInfo}>

            <strong>
              {cartItems.length}{' '}
              {cartItems.length === 1
                ? 'fotografía'
                : 'fotografías'}
            </strong>

            <span>
              Total: {formatPrice(cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0))}
            </span>

          </div>

          <button
            type="button"
            onClick={openCart}
            style={styles.checkoutButton}
          >
            Continuar
          </button>

        </div>
      )}

    </main>
  )
}

/* =====================================================
   ESTILOS
===================================================== */

const styles = {

  page: {
    minHeight: '100vh',
    background: '#08090d',
    color: '#f5f5f7',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    paddingBottom: '110px',
  },

  loading: {
    minHeight: '100vh',
    background: '#08090d',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
  },

  logo: {
    fontSize: '21px',
    fontWeight: '900',
    letterSpacing: '-0.8px',
  },

  loader: {
    width: '28px',
    height: '28px',
    margin: '25px auto 15px',
    border: '3px solid #242832',
    borderTop: '3px solid #b8ff3d',
    borderRadius: '50%',
    animation:
      'spin 1s linear infinite',
  },

  loadingText: {
    color: '#777d8d',
  },

  errorContainer: {
    width: '90%',
    maxWidth: '500px',
    textAlign: 'center',
  },

  errorIcon: {
    width: '50px',
    height: '50px',
    margin: '0 auto 20px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: '50%',
    background: '#45212a',
    color: '#ff9ba7',
    fontSize: '24px',
    fontWeight: '900',
  },

  errorTitle: {
    margin: 0,
    fontSize: '25px',
  },

  errorMessage: {
    color: '#777d8d',
    fontSize: '14px',
    lineHeight: 1.6,
    marginTop: '12px',
    wordBreak: 'break-word',
  },

  header: {
    minHeight: '76px',
    padding: '0 5%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #20232b',
    background: '#0b0c10',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },

  cartButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    border: '1px solid #30352b',
    borderRadius: '9px',
    background: '#141810',
    color: '#b8ff3d',
    cursor: 'pointer',
  },

  hero: {
    borderBottom: '1px solid #20232b',
    background:
      'radial-gradient(circle at 50% 0%, #151a12 0%, #08090d 55%)',
  },

  heroContent: {
    width: '90%',
    maxWidth: '950px',
    margin: '0 auto',
    padding: '75px 0 65px',
    textAlign: 'center',
  },

  eyebrow: {
    color: '#b8ff3d',
    fontSize: '10px',
    fontWeight: '900',
    letterSpacing: '2px',
    marginBottom: '14px',
  },

  title: {
    margin: 0,
    fontSize:
      'clamp(36px, 6vw, 65px)',
    lineHeight: 1,
    letterSpacing: '-2.5px',
    fontWeight: '850',
  },

  meta: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '18px',
    marginTop: '18px',
    color: '#777d8d',
    fontSize: '13px',
  },

  subtitle: {
    color: '#777d8d',
    margin: '20px 0 30px',
    fontSize: '14px',
  },

  searchWrapper: {
    width: '100%',
    maxWidth: '700px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    background: '#111319',
    border: '1px solid #30343d',
    borderRadius: '13px',
    padding: '0 15px',
    boxSizing: 'border-box',
  },

  searchIcon: {
    fontSize: '18px',
    opacity: 0.7,
  },

  searchInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#fff',
    padding: '17px 12px',
    fontSize: '14px',
  },

  clearButton: {
    border: 'none',
    background: 'transparent',
    color: '#777d8d',
    fontSize: '22px',
    cursor: 'pointer',
  },

  gallery: {
    width: '90%',
    maxWidth: '1250px',
    margin: '0 auto',
    padding: '45px 0 80px',
  },

  galleryHeader: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: '25px',
    gap: '20px',
  },

  galleryTitle: {
    margin: 0,
    fontSize: '25px',
    letterSpacing: '-0.6px',
    fontWeight: '800',
  },

  galleryDescription: {
    margin: '7px 0 0',
    color: '#686e7d',
    fontSize: '13px',
  },

  selectionInfo: {
    color: '#b8ff3d',
    fontSize: '13px',
  },

  photoGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(4, minmax(0, 1fr))',
    gap: '17px',
  },

  card: {
    overflow: 'hidden',
    background: '#101218',
    border: '1px solid #222630',
    borderRadius: '13px',
    transition:
      'transform .2s ease, border-color .2s ease',
  },

  selectedCard: {
    border: '1px solid #b8ff3d',
    transform: 'translateY(-2px)',
  },

  imageButton: {
    position: 'relative',
    display: 'block',
    width: '100%',
    aspectRatio: '4 / 3',
    padding: 0,
    border: 'none',
    background: '#171a21',
    cursor: 'pointer',
    overflow: 'hidden',
  },

  image: {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'cover',
  },

  noImage: {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    color: '#656b7a',
  },

  zoomBadge: {
    position: 'absolute',
    right: '10px',
    bottom: '10px',
    width: '30px',
    height: '30px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: '50%',
    background:
      'rgba(0,0,0,.65)',
    color: '#fff',
    fontSize: '15px',
  },

  cardInfo: {
    padding: '14px',
  },

  cardTitle: {
    fontWeight: '750',
    fontSize: '13px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  participant: {
    color: '#686e7d',
    fontSize: '11px',
    marginTop: '4px',
  },

  cardBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    marginTop: '14px',
  },

  price: {
    fontSize: '13px',
  },

  selectButton: {
    padding: '8px 10px',
    border: '1px solid #30343d',
    borderRadius: '7px',
    background: '#17191f',
    color: '#c3c6ce',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: '700',
  },

  selectedButton: {
    border: '1px solid #526f2b',
    background: '#1b2711',
    color: '#b8ff3d',
  },

  empty: {
    padding: '80px 20px',
    textAlign: 'center',
    border: '1px dashed #292e39',
    borderRadius: '17px',
  },

  emptyIcon: {
    fontSize: '35px',
    marginBottom: '15px',
  },

  emptyTitle: {
    margin: 0,
    fontSize: '20px',
  },

  emptyText: {
    color: '#686e7d',
    fontSize: '14px',
    marginTop: '10px',
  },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    display: 'grid',
    placeItems: 'center',
    padding: '25px',
    background: 'rgba(0,0,0,.88)',
    boxSizing: 'border-box',
  },

  modal: {
    width: '100%',
    maxWidth: '950px',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
    background: '#101218',
    border: '1px solid #292e38',
    borderRadius: '16px',
  },

  modalClose: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    zIndex: 2,
    width: '38px',
    height: '38px',
    border: 'none',
    borderRadius: '50%',
    background:
      'rgba(0,0,0,.65)',
    color: '#fff',
    fontSize: '25px',
    cursor: 'pointer',
  },

  modalImage: {
    display: 'block',
    width: '100%',
    maxHeight: '70vh',
    objectFit: 'contain',
    background: '#08090d',
  },

  modalInfo: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
  },

  modalTitle: {
    margin: 0,
    fontSize: '20px',
  },

  modalText: {
    margin: '7px 0 0',
    color: '#686e7d',
    fontSize: '13px',
  },

  modalActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },

  modalPrice: {
    fontSize: '17px',
  },

  modalSelect: {
    padding: '12px 16px',
    border: 'none',
    borderRadius: '9px',
    background: '#b8ff3d',
    color: '#08090d',
    fontWeight: '850',
    cursor: 'pointer',
  },

  bottomCart: {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 50,
    width: '90%',
    maxWidth: '700px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    padding: '14px 16px',
    background:
      'rgba(17,19,25,.96)',
    border: '1px solid #30352b',
    borderRadius: '13px',
    boxShadow:
      '0 15px 50px rgba(0,0,0,.5)',
    backdropFilter: 'blur(12px)',
    boxSizing: 'border-box',
  },

  bottomCartInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  checkoutButton: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '9px',
    background: '#b8ff3d',
    color: '#08090d',
    fontWeight: '850',
    cursor: 'pointer',
  },
}