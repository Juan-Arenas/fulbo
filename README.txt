SportPhoto — Fase 2B / Prototipo funcional completo
====================================================

Esta entrega termina el flujo funcional del prototipo ANTES de conectar servicios reales.

TIENDA PÚBLICA
- Eventos y galerías.
- Búsqueda por dorsal o nombre.
- Filtro por evento.
- Marca de agua visual en las previews.
- Carrito.
- Descuentos configurables por cantidad.
- Checkout con datos del cliente.
- Creación de pedido de prueba.
- Código de pedido.
- Consulta de pedidos por correo o código.
- Descarga de las fotografías compradas en el prototipo.

PANEL DEL FOTÓGRAFO
- Dashboard de eventos, fotos, pedidos y ventas.
- Crear/eliminar eventos.
- Subida múltiple de fotografías.
- Gestión de fotografías por evento.
- Edición de dorsal y nombre para cada foto.
- Precios y descuentos configurables.
- Vista de pedidos recibidos.

BASE LOCAL
- IndexedDB versión 2 compartida por index.html y admin.html.
- Stores: events, photos, orders, settings.
- Si ya abriste una versión anterior, el navegador migra la base local automáticamente.

LO QUE TODAVÍA NO ES PRODUCCIÓN
- IndexedDB es local al navegador; no es una nube.
- No hay autenticación real del fotógrafo.
- No hay servidor/API.
- Mercado Pago todavía es simulado.
- Las descargas todavía no están protegidas en servidor.
- El reconocimiento facial no está implementado todavía.
- No hay procesamiento masivo de miles de fotos en nube.

ÚLTIMA ETAPA: SISTEMA REAL
1. Supabase/PostgreSQL para datos.
2. Supabase Storage o S3 para fotos originales y previews.
3. Autenticación y roles de fotógrafo/admin.
4. API/Edge Functions.
5. Mercado Pago real + webhooks.
6. Pedidos y descargas firmadas/protegidas.
7. Procesamiento de imágenes y marca de agua.
8. Reconocimiento facial y búsqueda por rostro.
9. Backups, logs, seguridad y despliegue.
