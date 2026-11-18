# Registro de tostión · Don Manolo

App web para registrar las tostiones de clientes, calcular el cobro, enviar a contabilidad y compartir la remisión en PDF por WhatsApp.

Stack: Vite + React + TypeScript, Tailwind CSS v4, React Router, Supabase (base de datos, auth y tiempo real).

## Puesta en marcha

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea un proyecto en [supabase.com](https://supabase.com) y copia la URL y la anon key (Project Settings › API) en `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
3. Crea las tablas corriendo la migración:
   ```bash
   npx supabase login
   npx supabase link --project-ref <id-del-proyecto>
   npx supabase db push
   ```
   (O pega en el SQL Editor de Supabase, en orden, cada archivo de `supabase/migrations/`.)
4. Crea los usuarios del equipo en Supabase › Authentication › Users (correo + contraseña) y desactiva los registros públicos en Authentication › Sign In / Providers (*Allow new users to sign up*). Entran sin rol: un administrador se lo asigna en la app, en **Administración › Usuarios** (los usuarios que ya existían al aplicar la migración de roles quedan como administradores).
   Para que el administrador también pueda **crear usuarios desde la app**, publica la Edge Function (usa la llave de servicio, que nunca va al navegador):
   ```bash
   npx supabase functions deploy crear-usuario
   ```
5. Regenera los tipos (opcional, `src/types/database.ts` ya está escrito a mano según la migración):
   ```bash
   npx supabase gen types typescript --project-id <id-del-proyecto> > src/types/database.ts
   ```
6. Arranca:
   ```bash
   npm run dev
   ```

## Tablas

| Tabla | Qué guarda |
| --- | --- |
| `clientes` | Nombre, celular, datos de factura electrónica. Código `C-001`. |
| `lotes` | El café de un cliente y su avance por etapas (Recibido → Trillado → Tostado → Empacado → Entregado): recepción, trilla, bolsas, entrega, estado de envío a Siigo y **los precios vigentes al guardar** (si después cambian los precios, los cobros pasados no cambian). Código `L-0001`. Antes se llamaba `registros`. |
| `tostiones` | Los baches de tostión de cada lote: gramos de entrada y salida, tiempos, curva de Artisan o foto. |
| `pagos` | Abonos de cada lote: fecha, valor y método (Efectivo, Banco, Bold). |
| `configuracion` | Una sola fila: precios, rangos de alerta (humedad, trilla, merma), costo de gas por bache y usuario API de Siigo. |

Fotos y archivos de curva van en la carpeta privada `lotes` de Supabase Storage.

Todas con RLS. Cada usuario tiene un **rol** (`perfiles.rol_id`) y cada rol unos **permisos** (`rol_permisos`: tablero, nuevo lote, curvas, historial, clientes, configuración); el rol Administrador ve todo y administra roles y usuarios. Los permisos se cumplen en la base de datos con políticas restrictivas (`tiene_permiso()`), no solo en la app. Un usuario sin rol no ve nada. `user_id` guarda quién creó cada fila. Un lote enviado a Siigo sigue avanzando por etapas y recibiendo abonos, pero ya no se puede cambiar su cobro ni borrar (lo bloquea la base de datos). Un lote con abonos tampoco se puede borrar. Las tablas están en tiempo real: lo que se guarda en el computador aparece al instante en el celular.

## Pruebas

```bash
npm test          # cálculos (cobro, bolsas, mensajes)
npm run test:db   # aplica las migraciones en un Postgres en memoria y revisa datos, reglas y permisos
```

## Estructura

```
src/
  components/ui/       Botones, campos, avisos… genéricos
  components/layout/   Menú lateral, barra del celular, Layout
  features/
    auth/              Login y sesión
    clientes/          CRUD de clientes
    configuracion/     Precios y conexión Siigo
    registros/         Lista, formulario, detalle, envío
    remision/          PDF, vista de WhatsApp y compartir
  pages/               Una página por ruta
  lib/                 Cliente de Supabase, formatos, utilidades
  types/database.ts    Tipos de la base de datos
supabase/migrations/   SQL de tablas y políticas
scripts/               Prueba de migraciones (npm run test:db)
```

## Cotización en Siigo

Al pulsar **Enviar** en un lote entregado, la Edge Function `siigo` crea una **cotización** en Siigo (no una factura): las libras tostadas (gramos tostados ÷ 500, a 2 decimales) con el servicio de torrefacción (`STORRE`), y cada bolsa o drip del lote con su código y precio de Siigo. La forma de pago va escrita en la descripción de la torrefacción, porque la cotización no tiene medio de pago. La contadora la revisa en Siigo y la pasa a factura con **Facturar**; ahí se eligen el tipo de factura, los impuestos y el medio de pago, y se descuentan las bolsas del inventario de Siigo.

**Bolsas y drips**: al recibir y al empacar se eligen de una lista desplegable con los productos de Siigo que llevan inventario, con su precio y lo que queda en Siigo. Se guardan en `lotes.bolsas` con el precio de ese momento. La app ya no tiene precios de bolsas ni bodega propia: todo eso es de Siigo. Los lotes de antes conservan sus bolsas por tamaño (340 g, 500 g, 2.500 g, drip); si se envía uno de esos, pide elegir las bolsas otra vez de la lista de Siigo.

Un lote reabierto actualiza la misma cotización al reenviarlo (si Siigo no lo permite, crea otra que dice a cuál reemplaza), y reenviar no la duplica (`Idempotency-Key`). Si el cliente de un lote con factura no existe en Siigo, se crea con su nombre, documento, celular y correo, y con la dirección y ciudad (códigos DANE) de la configuración, porque Siigo las exige y la app no las pide.

**Configuración › Cotización en Siigo**: solo lo fijo — el servicio de torrefacción y el cliente (consumidor final y datos para crear clientes). El comprobante de cotización y el vendedor se toman solos si en Siigo hay uno; si hay varios, ahí se elige cuál. Se guarda en `public.configuracion`.

Solo el usuario API y la llave van como secretos de la función (nunca en el navegador ni en el código). La lista está en [supabase/functions/.env.example](supabase/functions/.env.example). Al cambiar el código de la función hay que publicarla:
```bash
npx supabase db push                 # aplica las migraciones nuevas
npx supabase functions deploy siigo  # publica la función
```

Para que VS Code no marque errores de `Deno` en `supabase/functions`, instala la extensión **Deno** (`denoland.vscode-deno`, recomendada en `.vscode/extensions.json`) y Deno (`winget install DenoLand.Deno`). La carpeta ya está habilitada en `.vscode/settings.json`.

## Pendiente

- **Datos de la tostadora en la remisión**: reemplaza `[NIT]`, `[CIUDAD]` y `[CELULAR DE LA TOSTADORA]` en `src/features/remision/negocio.ts`.
- **Al publicar** (Vercel, Netlify…): configura que todas las rutas sirvan `index.html` (app de una sola página) y agrega las dos variables `VITE_SUPABASE_*`.
