import CreateEvent from './pages/CreateEvent'
import EventDetails from './pages/EventDetails'
import PublicEvent from './pages/PublicEvent'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'

import AppLayout from './components/AppLayout'

function Home() {
  return (
    <AppLayout>
      <main
        style={{
          minHeight: 'calc(100vh - 76px)',
          background: '#08090d',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        }}
      >
        <div
          style={{
            textAlign: 'center',
            maxWidth: '700px'
          }}
        >
          <div
            style={{
              color: '#b8ff3d',
              fontSize: '10px',
              fontWeight: '900',
              letterSpacing: '2px',
              marginBottom: '12px'
            }}
          >
            FOTOGRAFÍA DEPORTIVA
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '52px',
              fontWeight: '900',
              letterSpacing: '-2px'
            }}
          >
            SPORT
            <span style={{ color: '#b8ff3d' }}>
              PHOTO
            </span>
          </h1>

          <p
            style={{
              color: '#777e8d',
              fontSize: '15px',
              marginTop: '16px'
            }}
          >
            Encuentra tus mejores momentos
            deportivos.
          </p>
        </div>
      </main>
    </AppLayout>
  )
}

function PublicEventPage() {
  return <PublicEvent />
}

function CartPage() {
  return <Cart />
}

function CheckoutPage() {
  return <Checkout />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =========================
            HOME
        ========================= */}

        <Route
          path="/"
          element={<Home />}
        />

        {/* =========================
            EVENTO PÚBLICO
        ========================= */}

        <Route
          path="/evento/:id"
          element={<PublicEventPage />}
        />

        {/* =========================
            CARRITO
        ========================= */}

        <Route
          path="/cart"
          element={<CartPage />}
        />

        {/* =========================
            CHECKOUT
        ========================= */}

        <Route
          path="/checkout"
          element={<CheckoutPage />}
        />

        {/* =========================
            LOGIN
        ========================= */}

        <Route
          path="/login"
          element={<Login />}
        />

        {/* =========================
            ADMIN / DASHBOARD
        ========================= */}

        <Route
          path="/admin"
          element={<Dashboard />}
        />

        {/* =========================
            CREAR EVENTO
        ========================= */}

        <Route
          path="/admin/events/new"
          element={<CreateEvent />}
        />

        {/* =========================
            DETALLES / GESTIONAR EVENTO
        ========================= */}

        <Route
          path="/admin/events/:id"
          element={<EventDetails />}
        />

        {/* =========================
            RUTA DESCONOCIDA
        ========================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App