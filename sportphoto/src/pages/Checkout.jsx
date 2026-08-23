import { useState } from 'react'

export default function Checkout() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  function handleSubmit(e) {
    e.preventDefault()

    alert(
      `Pedido preparado para ${name}`
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#08090d',
        color: '#fff',
        padding: '40px',
        boxSizing: 'border-box',
        fontFamily:
          'Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '700px',
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            fontSize: '36px',
            marginBottom: '10px',
          }}
        >
          Finalizar compra
        </h1>

        <p
          style={{
            color: '#888',
            marginBottom: '30px',
          }}
        >
          Completa tus datos para continuar.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            background: '#111318',
            border: '1px solid #292d36',
            borderRadius: '16px',
            padding: '25px',
          }}
        >
          <div
            style={{
              marginBottom: '20px',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                color: '#bbb',
              }}
            >
              Nombre completo
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Tu nombre"
              required
              style={inputStyle}
            />
          </div>

          <div
            style={{
              marginBottom: '20px',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                color: '#bbb',
              }}
            >
              Correo electrónico
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="correo@ejemplo.com"
              required
              style={inputStyle}
            />
          </div>

          <div
            style={{
              marginBottom: '25px',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                color: '#bbb',
              }}
            >
              Teléfono
            </label>

            <input
              type="tel"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
              placeholder="300 000 0000"
              required
              style={inputStyle}
            />
          </div>

          <div
            style={{
              padding: '18px',
              background: '#191c22',
              borderRadius: '10px',
              marginBottom: '25px',
            }}
          >
            <strong>
              Método de pago
            </strong>

            <p
              style={{
                color: '#777',
                fontSize: '13px',
                marginBottom: 0,
              }}
            >
              Mercado Pago será conectado en
              el siguiente paso.
            </p>
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '15px',
              border: 'none',
              borderRadius: '10px',
              background: '#b8ff3d',
              color: '#08090d',
              fontWeight: '800',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Confirmar pedido →
          </button>
        </form>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '13px',
  borderRadius: '8px',
  border: '1px solid #30343e',
  background: '#181b21',
  color: '#fff',
  outline: 'none',
  fontSize: '14px',
}