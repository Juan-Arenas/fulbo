import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'

import AppLayout from './components/AppLayout'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import CreateEvent from './pages/CreateEvent'
import Dashboard from './pages/Dashboard'
import EventDetails from './pages/EventDetails'
import Login from './pages/Login'
import PublicEvent from './pages/PublicEvent'

const CART_KEY = 'sportphoto_cart'

function formatMoney(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

async function getPhotoUrl(photo) {
  if (photo.url) return photo.url
  if (!photo.file_path) return null

  const { data } = await supabase.storage
    .from('event-photos')
    .createSignedUrl(photo.file_path, 3600)

  return data?.signedUrl || null
}

function Home() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [photos, setPhotos] = useState([])
  const [query, setQuery] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [results, setResults] = useState([])
  const [cartCount, setCartCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadHome()
    updateCartCount()

    const update = () => updateCartCount()
    window.addEventListener('sportphoto-cart-updated', update)
    window.addEventListener('storage', update)

    return () => {
      window.removeEventListener('sportphoto-cart-updated', update)
      window.removeEventListener('storage', update)
    }
  }, [])

  async function loadHome() {
    setLoading(true)
    setError('')

    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false })

      if (eventError) throw eventError

      const { data: photoData, error: photoError } = await supabase
        .from('photos')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })

      if (photoError) throw photoError

      setEvents(eventData || [])
      setPhotos(photoData || [])
    } catch (err) {
      console.error(err)
      setError(err?.message || 'No se pudieron cargar los eventos.')
    } finally {
      setLoading(false)
    }
  }

  function updateCartCount() {
    try {
      const saved = localStorage.getItem(CART_KEY)
      const cart = saved ? JSON.parse(saved) : []
      setCartCount(Array.isArray(cart)
        ? cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0)
        : 0)
    } catch {
      setCartCount(0)
    }
  }

  async function search() {
    const value = query.trim().toLowerCase()

    if (!value) {
      setResults([])
      return
    }

    setSearching(true)
    setError('')

    try {
      const matching = photos.filter((photo) => {
        const dorsal = String(photo.dorsal || '').toLowerCase()
        const name = String(photo.participant_name || '').toLowerCase()
        const fileName = String(photo.file_name || '').toLowerCase()

        return (
          (!eventFilter || photo.event_id === eventFilter) &&
          (dorsal === value || name.includes(value) || fileName.includes(value))
        )
      })

      const enriched = await Promise.all(
        matching.slice(0, 40).map(async (photo) => ({
          ...photo,
          url: await getPhotoUrl(photo),
        }))
      )

      setResults(enriched)
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar las fotografías.')
    } finally {
      setSearching(false)
    }
  }

  function addToCart(photo) {
    try {
      const saved = localStorage.getItem(CART_KEY)
      const cart = saved ? JSON.parse(saved) : []
      const current = Array.isArray(cart) ? cart : []

      if (current.some((item) => item.id === photo.id)) {
        navigate('/cart')
        return
      }

      const item = {
        id: photo.id,
        event_id: photo.event_id,
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

      localStorage.setItem(CART_KEY, JSON.stringify([...current, item]))
      window.dispatchEvent(new Event('sportphoto-cart-updated'))
      updateCartCount()
    } catch (err) {
      console.error(err)
      setError('No se pudo agregar la fotografía al carrito.')
    }
  }

  function eventName(id) {
    return events.find((event) => event.id === id)?.name || 'Evento'
  }

  const visibleEvents = useMemo(() => events.slice(0, 12), [events])

  return (
    <div className="storefront">
      <header className="top">
        <nav className="nav">
          <button className="brand" onClick={() => navigate('/')}>
            <span className="mark">SP</span>
            SportPhoto
          </button>

          <div className="links">
            <button onClick={() => document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth' })}>
              Eventos
            </button>
            <button onClick={() => document.getElementById('buscar')?.scrollIntoView({ behavior: 'smooth' })}>
              Buscar
            </button>
            <button onClick={() => document.getElementById('como')?.scrollIntoView({ behavior: 'smooth' })}>
              Cómo funciona
            </button>
            <button onClick={() => navigate('/login')}>
              Panel fotógrafo
            </button>
          </div>

          <div className="nav-actions">
            <button className="pill" onClick={() => navigate('/cart')}>
              🛒 <span className="count">{cartCount}</span>
            </button>
            <button className="primary" onClick={() => navigate('/login')}>
              Panel fotógrafo
            </button>
          </div>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">Fotografía deportiva profesional</div>
            <h1>Tu momento,<br /><span>tu foto.</span></h1>
            <p>
              Encontrá tus fotografías deportivas en segundos y conservá
              los momentos que hicieron especial tu competencia.
            </p>

            <div className="actions">
              <button
                className="primary"
                onClick={() => document.getElementById('buscar')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Buscar mis fotos ahora
              </button>
              <button
                className="secondary"
                onClick={() => document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Ver eventos
              </button>
            </div>

            <div className="stats">
              <div><strong>{events.length}</strong><span>Eventos</span></div>
              <div><strong>{photos.length}</strong><span>Fotografías</span></div>
              <div><strong>24/7</strong><span>Acceso online</span></div>
            </div>
          </div>
        </section>

        <section className="search-wrap" id="buscar">
          <div className="search-card">
            <div className="search-top">
              <div>
                <div className="kicker">Encontrá tu momento</div>
                <h2>Buscar fotos</h2>
                <p>Probá con un número de dorsal o nombre.</p>
              </div>
              <div className="kicker">Catálogo en vivo</div>
            </div>

            <div className="search-row">
              <input
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="Ej. 1542 o Juan Pérez"
              />

              <select
                className="input"
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
              >
                <option value="">Todos los eventos</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>

              <button className="primary" onClick={search} disabled={searching}>
                {searching ? 'Buscando...' : 'Buscar →'}
              </button>
            </div>

            {error && <div className="notice">{error}</div>}

            <div className="results">
              {!query.trim() ? (
                <p className="section-sub">
                  Escribí un dorsal o nombre para buscar tus fotografías.
                </p>
              ) : results.length ? (
                <div className="result-grid">
                  {results.map((photo) => (
                    <article className="photo-card" key={photo.id}>
                      <div className="photo-media">
                        {photo.url ? (
                          <img src={photo.url} alt="Fotografía deportiva" />
                        ) : (
                          <div style={{ height: 185, display: 'grid', placeItems: 'center' }}>
                            Sin vista previa
                          </div>
                        )}
                        <div className="watermark">SPORTPHOTO</div>
                      </div>

                      <div className="photo-info">
                        <strong>{eventName(photo.event_id)}</strong>
                        <small>
                          Dorsal {photo.dorsal || '—'} · {photo.participant_name || 'Participante'}
                        </small>
                        <button onClick={() => addToCart(photo)}>
                          {cartCount && false ? '' : 'Agregar al carrito'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="section-sub">
                  No encontramos fotografías para “{query}”.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="section" id="eventos">
          <div className="section-head">
            <div>
              <div className="kicker">Explorá</div>
              <h2>Eventos</h2>
            </div>
            <p className="section-sub">
              Cada evento tiene su propia galería y catálogo de fotografías.
            </p>
          </div>

          {loading ? (
            <div className="empty">Cargando eventos...</div>
          ) : visibleEvents.length ? (
            <div className="events">
              {visibleEvents.map((event) => {
                const count = photos.filter((photo) => photo.event_id === event.id).length

                return (
                  <article
                    className="event"
                    key={event.id}
                    onClick={() => navigate(`/evento/${event.id}`)}
                  >
                    <img
                      src={event.cover_url || event.cover || 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1000&q=85'}
                      alt={event.name}
                    />
                    <div className="event-body">
                      <h3>{event.name}</h3>
                      <div className="meta">
                        <span>◷ {event.event_date || event.date || 'Sin fecha'}</span>
                        <span>⌖ {event.location || event.place || 'Sin ubicación'}</span>
                      </div>
                      <div className="event-foot">
                        <span>{count} fotos</span>
                        <span>Explorar →</span>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="empty">Todavía no hay eventos publicados.</div>
          )}
        </section>

        <section className="how" id="como">
          <div className="section">
            <div className="section-head">
              <div>
                <div className="kicker">Simple</div>
                <h2>Cómo funciona</h2>
              </div>
            </div>

            <div className="steps">
              <article className="step">
                <div className="step-num">1</div>
                <h3>Encontrá tus fotos</h3>
                <p>Buscá por dorsal o nombre dentro del evento.</p>
              </article>
              <article className="step">
                <div className="step-num">2</div>
                <h3>Elegí tus momentos</h3>
                <p>Agregá las fotografías que quieras conservar al carrito.</p>
              </article>
              <article className="step">
                <div className="step-num">3</div>
                <h3>Comprá y descargá</h3>
                <p>Completá el checkout y, al aprobarse el pago, recibirás tu compra digital.</p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-in">
          <div className="brand">
            <span className="mark">SP</span>
            SportPhoto
          </div>
          <p>Plataforma de venta de fotografía deportiva</p>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/evento/:id" element={<PublicEvent />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/events/new" element={<CreateEvent />} />
        <Route path="/admin/events/:id" element={<EventDetails />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
