# SportPhoto — sistema integrado

Esta versión toma la web pública original de SportPhoto como portada y conecta el sistema React/Supabase que construimos detrás de ella.

## Rutas

- `/` — tienda pública con el diseño original, eventos reales, búsqueda y carrito.
- `/evento/:id` — galería pública del evento.
- `/cart` — carrito.
- `/checkout` — checkout y redirección a Mercado Pago.
- `/login` — acceso del fotógrafo.
- `/admin` — dashboard.
- `/admin/events/new` — crear evento.
- `/admin/events/:id` — gestionar evento.

## Variables públicas de Netlify

Configura:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

No subas claves secretas al repositorio.

## Secretos de Supabase Edge Functions

Configura en Supabase:

- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `SITE_URL=https://queridofulbo.netlify.app`

## Despliegue Netlify

- Base directory: vacío
- Build command: `npm run build`
- Publish directory: `dist`

`public/_redirects` ya está incluido para React Router.

## Edge Functions

Incluidas:

- `supabase/functions/create-payment`
- `supabase/functions/mercadopago-webhook`

Despliega ambas con Supabase CLI y configura los secretos antes de probar pagos.

## Importante

El ZIP no contiene `node_modules`, `.env` ni `dist`. Ejecuta `npm install` antes de desarrollar localmente.

