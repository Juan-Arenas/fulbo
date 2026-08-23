import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import CreateEvent from './pages/CreateEvent'
import EventDetails from './pages/EventDetails'
import PublicEvent from './pages/PublicEvent'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AppLayout from './components/AppLayout'
import PaymentResult from './pages/PaymentResult'

const CART_KEY = 'sportphoto_cart'

function money(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function Home() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [photos, setPhotos] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cartCount, setCartCount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]').reduce((n, item) => n + Number(item.quantity || 1), 0)
    } catch { return 0 }
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [{ data: eventData, error: eventError }, { data: photoData, error: photoError }] = await Promise.all([
          supabase.from('events').select('*').order('event_date', { ascending: false }),
          supabase.from('photos').select('*').eq('active', true).order('created_at', { ascending: false }).limit(12),
        ])
        if (eventError) throw eventError
        if (photoError) throw photoError
        setEvents(eventData || [])
        const withUrls = await Promise.all((photoData || []).map(async (photo) => {
          if (!photo.file_path) return { ...photo, url: null }
          const { data } = await supabase.storage.from('event-photos').createSignedUrl(photo.file_path, 3600)
          return { ...photo, url: data?.signedUrl || null }
        }))
        setPhotos(withUrls)
      } catch (e) {
        console.error(e)
        setError(e?.message || 'No se pudieron cargar los eventos.')
      } finally {
        setLoading(false)
      }
    }
    load()
    const updateCart = () => {
      try { setCartCount(JSON.parse(localStorage.getItem(CART_KEY) || '[]').reduce((n, item) => n + Number(item.quantity || 1), 0)) } catch { setCartCount(0) }
    }
    window.addEventListener('storage', updateCart)
    window.addEventListener('sportphoto-cart-updated', updateCart)
    return () => {
      window.removeEventListener('storage', updateCart)
      window.removeEventListener('sportphoto-cart-updated', updateCart)
    }
  }, [])

  const filteredPhotos = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return photos
    return photos.filter((p) => [p.file_name, p.dorsal, p.participant_name].some((v) => String(v || '').toLowerCase().includes(q)))
  }, [photos, query])

  return (
    <div className="legacy-home">
      <header className="legacy-top">
        <nav className="legacy-nav">
          <button className="legacy-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="legacy-mark">SP</span> SPORTPHOTO
          </button>
          <div className="legacy-links">
            <button onClick={() => document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth' })}>Eventos</button>
            <button onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}>Cómo funciona</button>
          </div>
          <div className="legacy-actions">
            <button className="legacy-pill" onClick={() => navigate('/cart')}>Carrito {cartCount > 0 && <b>{cartCount}</b>}</button>
            <button className="legacy-primary" onClick={() => navigate('/login')}>Iniciar sesión</button>
          </div>
        </nav>
      </header>

      <section className="legacy-hero">
        <div className="legacy-hero-inner">
          <div className="legacy-eyebrow">FOTOGRAFÍA DEPORTIVA PROFESIONAL</div>
          <h1>Tu momento.<br /><span>Tu foto.</span></h1>
          <p>Encuentra las fotografías de tus carreras, partidos y eventos deportivos. Busca por dorsal o nombre y conserva tu mejor momento.</p>
          <div className="legacy-actions-center">
            <button className="legacy-primary legacy-big" onClick={() => document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth' })}>Ver eventos</button>
            <button className="legacy-secondary legacy-big" onClick={() => navigate('/cart')}>Ver carrito</button>
          </div>
          <div className="legacy-stats">
            <div><strong>{events.length}</strong><span>Eventos</span></div>
            <div><strong>{photos.length}</strong><span>Fotos recientes</span></div>
            <div><strong>100%</strong><span>Digital</span></div>
          </div>
        </div>
      </section>

      <section className="legacy-search-wrap">
        <div className="legacy-search-card">
          <div className="legacy-search-top">
            <div><div className="legacy-kicker">ENCUENTRA TU FOTO</div><h2>Busca por dorsal o nombre</h2><p>Los resultados vienen directamente de tus eventos publicados.</p></div>
          </div>
          <div className="legacy-search-row">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ej. 27, Juan Pérez, dorsal..." />
            <button className="legacy-primary" onClick={() => document.getElementById('resultados')?.scrollIntoView({ behavior: 'smooth' })}>Buscar</button>
          </div>
          <div id="resultados" className="legacy-results">
            {loading && <div className="legacy-empty">Cargando fotografías...</div>}
            {!loading && error && <div className="legacy-empty legacy-error">{error}</div>}
            {!loading && !error && query && filteredPhotos.length === 0 && <div className="legacy-empty">No encontramos fotografías para esa búsqueda.</div>}
            {!loading && !error && filteredPhotos.length > 0 && (
              <div className="legacy-photo-grid">
                {filteredPhotos.map((photo) => (
                  <article className="legacy-photo-card" key={photo.id}>
                    <div className="legacy-photo-media">
                      {photo.url ? <img src={photo.url} alt={photo.file_name || 'Fotografía'} /> : <div className="legacy-photo-placeholder">SPORTPHOTO</div>}
                    </div>
                    <div className="legacy-photo-info">
                      <strong>{photo.participant_name || (photo.dorsal ? `Dorsal ${photo.dorsal}` : 'Fotografía')}</strong>
                      <small>{photo.dorsal ? `Dorsal ${photo.dorsal}` : photo.file_name}</small>
                      <button onClick={() => navigate(`/evento/${photo.event_id}`)}>Ver evento</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="eventos" className="legacy-section">
        <div className="legacy-section-head"><div><div className="legacy-kicker">EVENTOS</div><h2>Encuentra tu evento</h2><p>Abre un evento para explorar todas sus fotografías.</p></div></div>
        {loading ? <div className="legacy-empty">Cargando eventos...</div> : events.length === 0 ? <div className="legacy-empty">Todavía no hay eventos publicados.</div> : (
          <div className="legacy-events">
            {events.map((event) => (
              <article className="legacy-event" key={event.id} onClick={() => navigate(`/evento/${event.id}`)}>
                <div className="legacy-event-cover"><div>SPORTPHOTO</div></div>
                <div className="legacy-event-body">
                  <h3>{event.name}</h3>
                  <div className="legacy-meta"><span>{event.location || 'Evento deportivo'}</span><span>{event.event_date ? new Date(event.event_date).toLocaleDateString('es-CO') : 'Fecha por confirmar'}</span></div>
                  <div className="legacy-event-foot"><span>Ver fotografías</span><span>→</span></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="como-funciona" className="legacy-how">
        <div className="legacy-section">
          <div className="legacy-section-head"><div><div className="legacy-kicker">CÓMO FUNCIONA</div><h2>De la pista a tu pantalla</h2></div></div>
          <div className="legacy-steps">
            <div><b>01</b><h3>Busca tu evento</h3><p>Encuentra el evento deportivo donde participaste.</p></div>
            <div><b>02</b><h3>Encuentra tu foto</h3><p>Busca por dorsal o nombre y revisa tus fotografías.</p></div>
            <div><b>03</b><h3>Compra y descarga</h3><p>Añade tus favoritas al carrito y completa el checkout.</p></div>
          </div>
        </div>
      </section>

      <footer className="legacy-footer"><div><strong>SPORTPHOTO</strong><p>Fotografía deportiva profesional.</p></div><button onClick={() => navigate('/login')}>Acceso fotógrafo →</button></footer>
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
        <Route path="/checkout/success" element={<PaymentResult />} />
        <Route path="/checkout/failure" element={<PaymentResult />} />
        <Route path="/checkout/pending" element={<PaymentResult />} />
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
