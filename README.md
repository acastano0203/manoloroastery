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
4. Crea los usuarios del equipo en Supabase › Authentication › Users (correo + contraseña) y desactiva los registros públicos en Authentication › Sign In / Providers (*Allow new users to sign up*).
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

Todas con RLS: cualquier usuario con sesión iniciada ve y edita los datos del equipo; `user_id` guarda quién creó cada fila. Un lote enviado a Siigo sigue avanzando por etapas y recibiendo abonos, pero ya no se puede cambiar su cobro ni borrar (lo bloquea la base de datos). Un lote con abonos tampoco se puede borrar. Las tablas están en tiempo real: lo que se guarda en el computador aparece al instante en el celular.

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

## Pendiente

- **Siigo está simulado** (`src/features/configuracion/services/siigoService.ts`), igual que en el diseño: "Enviar" espera 1,5 s y marca el registro como enviado. Para conectarlo de verdad hay que crear una Edge Function de Supabase que guarde la llave de acceso como secreto y llame la API de Siigo.
- **Datos de la tostadora en la remisión**: reemplaza `[NIT]`, `[CIUDAD]` y `[CELULAR DE LA TOSTADORA]` en `src/features/remision/negocio.ts`.
- **Al publicar** (Vercel, Netlify…): configura que todas las rutas sirvan `index.html` (app de una sola página) y agrega las dos variables `VITE_SUPABASE_*`.
