// Prueba las migraciones de supabase/migrations en un Postgres real (PGlite), con lo mínimo de Supabase simulado.
// Uso: npm run test:db
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
const db = new PGlite()
let fallas = 0
const ok = (cond, msg) => { console.log((cond ? '  OK   ' : '  FALLA ') + msg); if (!cond) fallas++ }
const q = async (sql, p) => (await db.query(sql, p)).rows
const falla = async (sql, p) => { try { await db.query(sql, p); return null } catch (e) { return e.message } }

await db.exec(`
  create role authenticated; create role anon;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create publication supabase_realtime;
  alter default privileges in schema public grant all on tables to authenticated;
  grant usage on schema public to authenticated;
`)

const archivos = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
console.log('Migración inicial:', archivos[0])
await db.exec(readFileSync(join(dir, archivos[0]), 'utf8'))

// Datos como los de hoy
const U = '11111111-1111-1111-1111-111111111111'
await db.exec(`insert into auth.users values ('${U}');`)
await db.exec(`insert into clientes (nombre, celular, user_id) values ('Ana', '3001234567', '${U}'), ('Beto', '3109876543', '${U}');`)
for (const d of [['Ana', '2026-10-01', 'Efectivo', 12.5, 10000, 2, 0, 'Enviado'],
                 ['Beto', '2026-10-02', 'Bold', 5, 4250, 0, 1, 'Pendiente'],
                 ['Ana', '2026-10-03', 'Banco', 3, 1001, 0, 0, 'Error']]) {
  await db.query(`
    insert into registros (cliente_id, fecha, cliente, celular, pago, proceso, kilos, gramos, n340, n500, n2500,
                           precio_lb, precio_340, precio_500, precio_2500, estado, user_id)
    select id, $2::date, nombre, celular, $3::forma_pago, 'Pergamino', $4, $5, $6, 0, $7, 3000, 1500, 1800, 4000, $8::estado_envio, '${U}'
    from clientes where nombre = $1`, d)
}
const antes = await q(`select id, codigo, gramos, kilos, n340, n2500, pago, estado, fecha from registros order by numero`)

for (const f of archivos.slice(1)) {
  console.log('Migración nueva:', f)
  await db.exec(readFileSync(join(dir, f), 'utf8'))
}

console.log('\nDatos existentes')
const lotes = await q(`select * from lotes order by numero`)
ok(lotes.length === 3, `siguen los 3 registros (${lotes.length})`)
ok(lotes.map((l) => l.codigo).join() === 'L-0001,L-0002,L-0003', `códigos L-: ${lotes.map((l) => l.codigo).join(', ')}`)
ok(lotes.every((l, i) => l.id === antes[i].id && l.gramos === antes[i].gramos && l.pago === antes[i].pago && l.estado === antes[i].estado),
  'ids, gramos, forma de pago y estado de envío sin cambios')
ok(lotes.every((l) => l.etapa === 'Entregado'), 'todos en etapa Entregado')
ok(lotes.every((l) => l.llegada === null && l.fecha_entrega_prometida === null), 'campos nuevos vacíos en los viejos')
const pagos = await q(`select l.codigo, p.valor, p.metodo, p.fecha::text from pagos p join lotes l on l.id = p.lote_id order by l.numero`)
// 10000 g → 20 lb × 3000 = 60000 + 2×1500 = 63000 · 4250 g → 8,5 lb × 3000 = 25500 + 4000 = 29500 · 1001 g → 6006
ok(JSON.stringify(pagos.map((p) => p.valor)) === '[63000,29500,6006]', `pago por el total: ${pagos.map((p) => p.valor).join(', ')}`)
ok(pagos.map((p) => p.metodo).join() === 'Efectivo,Bold,Banco', 'pago con su forma de pago')
ok(pagos.map((p) => p.fecha).join() === '2026-10-01,2026-10-02,2026-10-03', 'pago con la fecha del registro')
const cfg = (await q(`select * from configuracion`))[0]
ok(cfg.precio_lb === 3000 && Number(cfg.humedad_min) === 10 && Number(cfg.merma_max) === 20 && cfg.gas_por_bache === null,
  'configuración: precios intactos y rangos por defecto')
ok((await q(`select 1 from storage.buckets where id = 'lotes' and not public`)).length === 1, 'carpeta privada "lotes" creada')
const pub = (await q(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1`)).map((r) => r.tablename)
ok(['clientes', 'configuracion', 'lotes', 'pagos', 'tostiones'].every((t) => pub.includes(t)), `tiempo real: ${pub.join(', ')}`)

console.log('\nComo usuario del equipo')
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${U}', false);`)
const cli = (await q(`select id from clientes where nombre = 'Ana'`))[0].id
const nuevo = (await q(`
  insert into lotes (cliente_id, cliente, celular, proceso, kilos, gramos, precio_lb, precio_340, precio_500, precio_2500)
  values ($1, 'Ana', '3001234567', 'Natural', 4, 2000, 3000, 1500, 1800, 4000) returning *`, [cli]))[0]
ok(nuevo.codigo === 'L-0004' && nuevo.etapa === 'Recibido' && nuevo.llegada === 'Pergamino', 'lote nuevo: L-0004, Recibido, Pergamino')
ok(nuevo.pago === null && nuevo.user_id === U, 'lote nuevo sin forma de pago y con quién lo creó')
const prom = (await q(`select fecha_entrega_prometida = current_date + 3 as ok from lotes where id = $1`, [nuevo.id]))[0].ok
ok(prom, 'entrega prometida = hoy + 3 días')

const enviado = lotes[0].id
ok(!(await falla(`update lotes set etapa = 'Entregado', subproducto_entregado = true, kilos_verde = 10 where id = $1`, [enviado])),
  'lote enviado: sí deja cambiar etapa y datos de proceso')
let e = await falla(`update lotes set gramos = 1 where id = $1`, [enviado])
ok(e?.includes('contabilidad'), `lote enviado: no deja cambiar el cobro (${e})`)
e = await falla(`update lotes set n340 = 5 where id = $1`, [enviado])
ok(!!e, 'lote enviado: no deja cambiar bolsas')
await q(`delete from lotes where id = $1`, [enviado])
ok((await q(`select 1 from lotes where id = $1`, [enviado])).length === 1, 'lote enviado: no se borra')
ok(!(await falla(`update lotes set gramos = 1500 where id = $1`, [lotes[1].id])), 'lote pendiente: sí deja cambiar el cobro')

e = await falla(`delete from lotes where id = $1`, [lotes[1].id])
ok(e?.includes('foreign key'), `lote con abonos: no se borra (${e})`)
ok(!(await falla(`delete from lotes where id = $1`, [nuevo.id])), 'lote sin abonos y no enviado: sí se borra')

ok(!!(await falla(`update lotes set molienda = 'Fino' where id = $1`, [lotes[1].id])), 'molienda sin "Molido": rechazada')
ok(!(await falla(`update lotes set presentacion = 'Molido', molienda = 'Fino', humedad_pct = 11.5 where id = $1`, [lotes[1].id])),
  'Molido + Fino + humedad 11,5: aceptado')
ok(!!(await falla(`update lotes set humedad_pct = 120 where id = $1`, [lotes[1].id])), 'humedad 120 %: rechazada')

const t = (await q(`insert into tostiones (lote_id, gramos_verde_entrada) values ($1, 2000) returning *`, [lotes[1].id]))[0]
ok(t.gramos_tostado_salida === null && t.user_id === U, 'bache con solo la entrada: aceptado')
ok(!!(await falla(`insert into tostiones (lote_id, gramos_verde_entrada) values ($1, 0)`, [lotes[1].id])), 'bache con 0 g: rechazado')
ok(!(await falla(`insert into pagos (lote_id, valor, metodo) values ($1, 10000, 'Bold')`, [enviado])), 'abono a lote enviado: aceptado')
ok(!!(await falla(`insert into pagos (lote_id, valor, metodo) values ($1, 0, 'Bold')`, [enviado])), 'abono de $0: rechazado')
ok(!!(await falla(`update configuracion set humedad_min = 15`)), 'rango con mínimo mayor que máximo: rechazado')

console.log('\nVersión anterior de la app (vista "registros")')
ok((await q(`select codigo from registros order by numero`)).length === 3, 'puede leer')
const viejo = (await q(`
  insert into registros (cliente_id, cliente, celular, pago, proceso, kilos, gramos, precio_lb, precio_340, precio_500, precio_2500)
  values ($1, 'Ana', '3001234567', 'Efectivo', 'Honey', 1, 500, 3000, 1500, 1800, 4000) returning id`, [cli]))[0]
ok((await q(`select etapa from lotes where id = $1`, [viejo.id]))[0].etapa === 'Recibido', 'puede crear (queda en Recibido)')
ok(!!(await falla(`update registros set gramos = 1 where id = $1`, [enviado])), 'no puede cambiar el cobro de un enviado')

console.log(fallas ? `\n${fallas} prueba(s) fallaron` : '\nTodas las pruebas pasaron')
process.exit(fallas ? 1 : 0)
