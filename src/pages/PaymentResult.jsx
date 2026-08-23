import { useLocation, useNavigate } from 'react-router-dom'

export default function PaymentResult() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(search)
  const approved = pathname.endsWith('/success') || params.get('status') === 'approved'
  const pending = pathname.endsWith('/pending')
  return <main className="sp-page"><section className="sp-container"><div className="sp-card sp-empty-page"><div className="sp-empty-icon">{approved ? '✓' : pending ? '…' : '!'}</div><h1>{approved ? 'Pago aprobado' : pending ? 'Pago pendiente' : 'Pago no completado'}</h1><p>{approved ? 'Tu pedido quedó enviado a SportPhoto.' : pending ? 'Mercado Pago todavía está procesando el pago.' : 'Puedes volver al carrito e intentarlo nuevamente.'}</p><button className="sp-primary" onClick={() => navigate('/')}>Volver a SportPhoto</button></div></section></main>
}
