-- ⚠️ BORRA TODOS LOS REGISTROS DE LOTES AL APLICARSE (npx supabase db push). NO SE PUEDE DESHACER.
-- Limpieza para empezar la prueba de punta a punta de la cotización en Siigo con la base vacía.
-- Antes de aplicarla, si hay algo que conservar: Database › Backups, o Table Editor › lotes › Export (CSV).
--
-- Borra: lotes, pagos, tostiones y curvas de tostión, y reinicia el consecutivo (L-0001).
-- No toca: clientes, configuración (precio por libra y ajustes de Siigo), usuarios, roles ni permisos.
-- Como migración corre una sola vez; en una base nueva no hace nada (las tablas están vacías).
--
-- Aparte, a mano:
--   · Fotos de almacenamiento y PDFs de curvas: Storage › bucket "lotes" › seleccionar todo › borrar
--     (Supabase no deja borrar archivos de Storage con SQL).
--   · Cotizaciones y clientes de prueba que se hayan creado en Siigo: borrarlos en Siigo.

-- pagos se borra junto con lotes: la base no deja borrar un lote que tenga pagos.
truncate table public.tostion_lecturas, public.tostiones, public.pagos, public.lotes restart identity;
