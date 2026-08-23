import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CreateEvent() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createEvent(e) {
    e.preventDefault()

    setLoading(true)
    setError('')

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Tu sesión ha expirado.')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('events')
      .insert({
        photographer_id: user.id,
        name,
        description,
        location,
        event_date: eventDate || null
      })

    if (error) {
      console.error(error)
      setError(error.message)
      setLoading(false)
      return
    }

    navigate('/admin')
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#09090b',
        color: '#fff',
        padding: '50px',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <div
        style={{
          maxWidth: '700px',
          margin: '0 auto'
        }}
      >
        <button
          onClick={() => navigate('/admin')}
          style={{
            background: 'none',
            border: 'none',
            color: '#858b9b',
            cursor: 'pointer',
            marginBottom: '30px'
          }}
        >
          ← Volver al panel
        </button>

        <h1 style={{ fontSize: '40px' }}>
          Crear evento
        </h1>

        <p style={{ color: '#858b9b' }}>
          Crea un nuevo evento deportivo para comenzar a subir fotografías.
        </p>

        <form
          onSubmit={createEvent}
          style={{
            marginTop: '35px',
            background: '#111318',
            border: '1px solid #272a33',
            borderRadius: '20px',
            padding: '30px'
          }}
        >
          <label>Nombre del evento</label>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Copa Nacional 2026"
            required
            style={inputStyle}
          />

          <label>Descripción</label>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción del evento..."
            rows="4"
            style={inputStyle}
          />

          <label>Lugar</label>

          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ej. Estadio El Campín"
            style={inputStyle}
          />

          <label>Fecha</label>

          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            style={inputStyle}
          />

          {error && (
            <div
              style={{
                background: '#2a1518',
                color: '#ff8d9b',
                padding: '12px',
                borderRadius: '10px',
                marginTop: '15px'
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: '25px',
              padding: '15px',
              border: 'none',
              borderRadius: '12px',
              background: '#b8ff3d',
              color: '#09090b',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Creando evento...' : 'Crear evento'}
          </button>
        </form>
      </div>
    </main>
  )
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '14px',
  marginTop: '8px',
  marginBottom: '20px',
  borderRadius: '12px',
  border: '1px solid #2b2f3b',
  background: '#090a0e',
  color: '#fff'
}