import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()

    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      navigate('/admin')
    }

    setLoading(false)
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#09090b',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px',
          background: '#111318',
          border: '1px solid #272a33',
          borderRadius: '24px'
        }}
      >
        <div
          style={{
            fontSize: '22px',
            fontWeight: '800',
            marginBottom: '40px'
          }}
        >
          SPORT<span style={{ color: '#b8ff3d' }}>PHOTO</span>
        </div>

        <h1 style={{ fontSize: '36px', margin: '0 0 8px' }}>
          Bienvenido
        </h1>

        <p style={{ color: '#858b9b', marginBottom: '30px' }}>
          Accede al panel de fotógrafo
        </p>

        <form onSubmit={handleLogin}>
          <label>Correo electrónico</label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            style={{
              width: '100%',
              padding: '14px',
              marginTop: '8px',
              marginBottom: '18px',
              borderRadius: '12px',
              border: '1px solid #2b2f3b',
              background: '#090a0e',
              color: '#fff'
            }}
          />

          <label>Contraseña</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={{
              width: '100%',
              padding: '14px',
              marginTop: '8px',
              marginBottom: '18px',
              borderRadius: '12px',
              border: '1px solid #2b2f3b',
              background: '#090a0e',
              color: '#fff'
            }}
          />

          {error && (
            <div
              style={{
                padding: '12px',
                marginBottom: '18px',
                borderRadius: '10px',
                background: '#2a1518',
                color: '#ff8d9b'
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
              padding: '15px',
              border: 'none',
              borderRadius: '12px',
              background: '#b8ff3d',
              color: '#09090b',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </main>
  )
}