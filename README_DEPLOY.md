# SportPhoto integrado

La aplicación React/Vite quedó integrada en la raíz del proyecto. La portada conserva el estilo de la web original y el resto del sistema usa las rutas de SportPhoto.

## Netlify

- Base directory: vacío
- Build command: `npm run build`
- Publish directory: `dist`

Variables de Production:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` o `VITE_SUPABASE_ANON_KEY`

Netlify debe volver a construir después de cambiar variables.

## Supabase Edge Functions

Funciones incluidas:
- `create-payment`
- `mercadopago-webhook`

Secretos en Supabase:
- `MERCADOPAGO_ACCESS_TOKEN`
- `SITE_URL=https://queridofulbo.netlify.app`

Las claves secretas de Supabase nunca deben ponerse en el frontend.
