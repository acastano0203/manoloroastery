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
  create table auth.users (id uuid primary key, email text);
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
ok((await q(`select 1 from storage.buckets where id = 'lotes' and 'application/pdf' = any (allowed_mime_types)`)).length === 1, 'carpeta "lotes" acepta PDF')
ok((await q(`select 1 from storage.buckets where id = 'lotes' and 'image/heic' = any (allowed_mime_types)`)).length === 1, 'carpeta "lotes" acepta fotos HEIC')
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

const sinGramos = (await q(`
  insert into lotes (cliente_id, cliente, celular, proceso, kilos, precio_lb, precio_340, precio_500, precio_2500)
  values ($1, 'Ana', '3001234567', 'Natural', 4, 3000, 1500, 1800, 4000) returning *`, [cli]))[0]
ok(sinGramos.gramos === null && sinGramos.etapa === 'Recibido', 'lote recibido sin café a tostar: aceptado')
ok(!(await falla(`update lotes set etapa = 'Trillado' where id = $1`, [sinGramos.id])), 'trillado sin café a tostar: aceptado')
let e = await falla(`update lotes set etapa = 'Tostado' where id = $1`, [sinGramos.id])
ok(e?.includes('lotes_gramos_al_tostar'), `tostado sin café a tostar: rechazado (${e})`)
ok(!(await falla(`update lotes set etapa = 'Tostado', gramos = 3500 where id = $1`, [sinGramos.id])), 'tostado con café a tostar: aceptado')
ok(!!(await falla(`update lotes set gramos = null where id = $1`, [sinGramos.id])), 'tostado: no deja borrar el café a tostar')
await q(`delete from lotes where id = $1`, [sinGramos.id])

const enviado = lotes[0].id
ok(!(await falla(`update lotes set etapa = 'Entregado', subproducto_entregado = true, kilos_verde = 10 where id = $1`, [enviado])),
  'lote enviado: sí deja cambiar etapa y datos de proceso')
e = await falla(`update lotes set gramos = 1 where id = $1`, [enviado])
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
ok(!(await falla(`update lotes set densidad_gl = 712.5 where id = $1`, [lotes[1].id])), 'densidad 712,5 g/L: aceptada')
ok(!(await falla(`update lotes set n_drip = 10, precio_drip = 2500, bolsas_cliente = true, gramos_tostado = 1200 where id = $1`, [lotes[1].id])),
  'empaque: drips, sin bolsa y peso tostado aceptados')
e = await falla(`update lotes set gramos_tostado = 999999 where id = $1`, [lotes[1].id])
ok(e?.includes('lotes_tostado_menor_que_almendra'), `tostado que pesa más que la almendra: rechazado (${e})`)
e = await falla(`update lotes set n_drip = 3 where id = $1`, [enviado])
ok(e?.includes('contabilidad'), `lote enviado: no deja cambiar los drips (${e})`)
ok(!(await falla(`update lotes set gramos_tostado = 8000 where id = $1`, [enviado])), 'lote enviado: sí deja anotar el peso tostado')
ok(lotes.every((l) => l.almacenamiento === false), 'lotes existentes: sin almacenamiento')
e = await falla(`update lotes set almacenamiento = true, almacen_dias = 3 where id = $1`, [lotes[1].id])
ok(e?.includes('lotes_almacenamiento_completo'), `almacenamiento sin cantidad, marcado ni foto: rechazado (${e})`)
ok(!!(await falla(`update lotes set almacenamiento = true, almacen_dias = 11, almacen_gramos = 1000, almacen_marcado = 'Bolsa roja', almacen_foto = 'x.jpg' where id = $1`, [lotes[1].id])),
  'almacenamiento de 11 días: rechazado (máximo 10)')
ok(!(await falla(`update lotes set almacenamiento = true, almacen_dias = 10, almacen_gramos = 1000, almacen_marcado = 'Bolsa roja', almacen_foto = 'x.jpg' where id = $1`, [lotes[1].id])),
  'almacenamiento completo de 10 días: aceptado')
ok((await q(`select almacen_unidad from lotes where id = $1`, [lotes[1].id]))[0].almacen_unidad === 'g', 'unidad del almacenamiento: gramos por defecto')
ok(!(await falla(`update lotes set almacen_unidad = 'lb' where id = $1`, [lotes[1].id])), 'unidad en libras: aceptada')
ok(!!(await falla(`update lotes set almacen_unidad = 'oz' where id = $1`, [lotes[1].id])), 'unidad en onzas: rechazada')
ok(!!(await falla(`update lotes set densidad_gl = 0 where id = $1`, [lotes[1].id])), 'densidad 0 g/L: rechazada')

const t = (await q(`insert into tostiones (lote_id, gramos_verde_entrada) values ($1, 2000) returning *`, [lotes[1].id]))[0]
ok(t.gramos_tostado_salida === null && t.user_id === U, 'bache con solo la entrada: aceptado')
ok(!!(await falla(`insert into tostiones (lote_id, gramos_verde_entrada) values ($1, 0)`, [lotes[1].id])), 'bache con 0 g: rechazado')

ok(t.origen === 'manual', 'bache nuevo: curva manual por defecto')
ok(!(await falla(`update tostiones set temp_carga_c = 200, aire_inicial = 25, llama_inicial = 100, crack_seg = 480, descarga_seg = 600 where id = $1`, [t.id])),
  'curva: carga, aire, llama, crack y descarga aceptados')
ok(!!(await falla(`update tostiones set aire_inicial = 30 where id = $1`, [t.id])), 'aire 30: rechazado (solo 0, 25, 50, 75, 100)')
ok(!!(await falla(`update tostiones set crack_seg = 700 where id = $1`, [t.id])), 'crack después de la descarga: rechazado')
ok(!(await falla(`insert into tostion_lecturas (tostion_id, segundo, temp_grano, temp_tambor, aire, llama) values ($1, 60, 95.5, 180, 25, 30)`, [t.id])),
  'lectura del minuto 1: aceptada')
ok(!!(await falla(`insert into tostion_lecturas (tostion_id, segundo, temp_grano) values ($1, 60, 100)`, [t.id])), 'dos lecturas del mismo minuto: rechazado')
ok(!!(await falla(`insert into tostion_lecturas (tostion_id, segundo) values ($1, 1860)`, [t.id])), 'lectura después del minuto 30: rechazada')
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

console.log('\nReabrir un lote enviado')
e = await falla(`update lotes set estado = 'Pendiente', gramos = 9999 where id = $1`, [enviado])
ok(e?.includes('contabilidad'), `reabrir y cambiar el cobro a la vez: rechazado (${e})`)
ok(!!(await falla(`update lotes set estado = 'Error' where id = $1`, [enviado])), 'enviado → Error: rechazado')
ok(!(await falla(`update lotes set estado = 'Pendiente', enviado_at = null, reabierto_at = now() where id = $1`, [enviado])),
  'reabrir (Enviado → Pendiente): aceptado')
ok(!(await falla(`update lotes set gramos = 9000 where id = $1`, [enviado])), 'reabierto: sí deja cambiar el cobro')

console.log('\nRoles y permisos')
const como = async (id) => db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${id}', false);`)
await db.exec(`reset role;`)
const TOST = '22222222-2222-2222-2222-222222222222', NUEVO = '33333333-3333-3333-3333-333333333333'
await db.exec(`insert into auth.users (id, email) values ('${TOST}', 'tostador@x.co'), ('${NUEVO}', 'nuevo@x.co');`)
const perfiles = await q(`select p.id, p.correo, r.nombre as rol from perfiles p left join roles r on r.id = p.rol_id`)
ok(perfiles.find((p) => p.id === U)?.rol === 'Administrador', 'usuario que ya existía: queda como Administrador')
ok(perfiles.find((p) => p.id === NUEVO)?.rol === null && perfiles.find((p) => p.id === NUEVO)?.correo === 'nuevo@x.co', 'usuario nuevo: perfil sin rol, con su correo')
const permisosAux = (await q(`select permiso from rol_permisos rp join roles r on r.id = rp.rol_id where r.nombre = 'Auxiliar' order by 1`)).map((x) => x.permiso)
ok(permisosAux.join() === 'clientes,historial,nuevo_lote,tablero', `Auxiliar arranca con: ${permisosAux.join(', ')}`)
await db.exec(`update perfiles set rol_id = (select id from roles where nombre = 'Tostador') where id = '${TOST}'`)

await como(NUEVO)
ok((await q(`select 1 from lotes`)).length === 0, 'sin rol: no ve lotes')
ok((await q(`select 1 from clientes`)).length === 0, 'sin rol: no ve clientes')

await como(TOST)
ok((await q(`select 1 from lotes`)).length > 0, 'tostador: ve los lotes (tablero)')
e = await falla(`insert into lotes (cliente_id, cliente, celular, proceso, kilos, precio_lb, precio_340, precio_500, precio_2500)
  values ($1, 'Ana', '3001234567', 'Natural', 4, 3000, 1500, 1800, 4000)`, [cli])
ok(!!e, `tostador: no crea lotes (${e})`)
ok((await q(`update configuracion set precio_lb = 1 returning 1`)).length === 0, 'tostador: no cambia la configuración')
ok((await q(`update perfiles set rol_id = (select id from roles where administrador) where id = '${TOST}' returning 1`)).length === 0,
  'tostador: no se puede dar el rol de administrador')
ok(!!(await falla(`insert into roles (nombre) values ('Hacker')`)), 'tostador: no crea roles')
ok(!(await falla(`insert into tostiones (lote_id, gramos_verde_entrada) values ($1, 1000)`, [lotes[1].id])), 'tostador: sí registra tostiones (curvas)')

await como(U)
ok(!(await falla(`insert into roles (nombre) values ('Bodega')`)), 'admin: crea un rol')
e = await falla(`update perfiles set rol_id = null where id = $1`, [U])
ok(e?.includes('al menos un administrador'), `admin: no puede quitarse el rol si es el único (${e})`)
e = await falla(`delete from roles where administrador`)
ok(e?.includes('no se puede eliminar'), `el rol Administrador no se borra (${e})`)
ok((await q(`select 1 from perfiles`)).length === 3, 'admin: ve todos los perfiles')
ok(!(await falla(`insert into rol_permisos (rol_id, permiso) select id, 'reportes' from roles where nombre = 'Tostador'`)), 'permiso reportes: se puede asignar')

console.log('\nPermiso de Administración (sin ser Administrador)')
await q(`insert into rol_permisos (rol_id, permiso) select id, 'administracion' from roles where nombre = 'Bodega'`)
await q(`update perfiles set rol_id = (select id from roles where nombre = 'Bodega') where id = '${NUEVO}'`)
await como(NUEVO)
ok((await q(`select public.administra() a`))[0].a === true && (await q(`select public.es_admin() a`))[0].a === false, 'administra, pero no es Administrador')
ok((await q(`select 1 from perfiles`)).length === 3, 've todos los usuarios')
ok(!(await falla(`insert into roles (nombre) values ('Empaque')`)), 'crea roles')
ok(!(await falla(`insert into rol_permisos (rol_id, permiso) select id, 'clientes' from roles where nombre = 'Empaque'`)), 'les da permisos de los menús')
ok(!!(await falla(`insert into rol_permisos (rol_id, permiso) select id, 'administracion' from roles where nombre = 'Empaque'`)), 'no da el permiso de Administración')
ok((await q(`delete from rol_permisos where permiso = 'administracion' returning 1`)).length === 0, 'no quita el permiso de Administración')
ok(!(await falla(`update perfiles set rol_id = (select id from roles where nombre = 'Tostador') where id = '${TOST}'`)), 'asigna otros roles')
e = await falla(`update perfiles set rol_id = (select id from roles where administrador) where id = '${NUEVO}'`)
ok(e?.includes('Solo un administrador'), `no se pone el rol Administrador (${e})`)
e = await falla(`update perfiles set rol_id = null where id = '${U}'`)
ok(e?.includes('Solo un administrador'), `no le quita el rol al Administrador (${e})`)
ok((await q(`select 1 from configuracion where precio_lb > 0`)).length === 1 && (await q(`select 1 from lotes`)).length === 0,
  'no ve los lotes (no tiene ese menú)')
await como(U)

console.log('\nCódigo del lote')
const nuevoLote = async (extra = '', valores = '') => (await q(`insert into lotes (cliente_id, cliente, celular, proceso, kilos, precio_lb, precio_340, precio_500, precio_2500${extra})
  values ($1, 'Ana', '3001234567', 'Natural', 4, 3000, 1500, 1800, 4000${valores}) returning id, numero, codigo`, [cli]))[0]
let l = await nuevoLote()
ok(l.codigo === 'L-' + String(l.numero).padStart(4, '0'), `sin nombre: queda el consecutivo (${l.codigo})`)
l = await nuevoLote(', codigo', `, '  Lote El Mirador '`)
ok(l.codigo === 'Lote El Mirador', 'con el nombre de la finca: se guarda (sin espacios de más)')
const [vuelto] = await q(`update lotes set codigo = '' where id = $1 returning codigo`, [l.id])
ok(vuelto.codigo === 'L-' + String(l.numero).padStart(4, '0'), 'si se borra el nombre: vuelve al consecutivo')
ok(!!(await falla(`update lotes set codigo = $2 where id = $1`, [l.id, 'x'.repeat(41)])), 'más de 40 letras: rechazado')

console.log('\nInventario de bolsas')
const stock = async () => (await q(`select stock_340 s340, stock_500 s500, stock_2500 s2500, stock_drip sd from configuracion`))[0]
await q(`update configuracion set stock_340 = 100, stock_500 = 10, stock_drip = 20`)
const b = await nuevoLote(', n340, n500, n2500, n_drip', ', 3, 1, 2, 5')
let s = await stock()
ok(s.s340 === 97 && s.s500 === 9 && s.sd === 15, `al recibir se descuentan: 340 g ${s.s340}, 500 g ${s.s500}, drips ${s.sd}`)
ok(s.s2500 === null, 'sin inventario de 2.500 g: sigue vacío')
await q(`update lotes set n340 = 5 where id = $1`, [b.id])
ok((await stock()).s340 === 95, 'al empacar con más bolsas: descuenta solo la diferencia')
await q(`update lotes set kilos = 5 where id = $1`, [b.id])
ok((await stock()).s340 === 95, 'cambiar otra cosa del lote no mueve el inventario')
await q(`update lotes set bolsas_cliente = true, n340 = 0, n500 = 0, n2500 = 0 where id = $1`, [b.id])
s = await stock()
ok(s.s340 === 100 && s.s500 === 10 && s.sd === 15, '«Sin bolsa»: las bolsas vuelven a la bodega; los drips no')
await como(TOST)
ok(!(await falla(`update lotes set n_drip = 7 where id = $1`, [b.id])), 'tostador (sin permiso de configuración): sí cambia los drips del lote')
await como(U)
ok((await stock()).sd === 13, 'y el inventario se descuenta igual')
await q(`delete from lotes where id = $1`, [b.id])
ok((await stock()).sd === 20, 'al borrar el lote: los drips vuelven a la bodega')

console.log(fallas ? `\n${fallas} prueba(s) fallaron` : '\nTodas las pruebas pasaron')
process.exit(fallas ? 1 : 0)
