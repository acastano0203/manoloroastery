-- Fase 0 · De "registros" a "lotes" con etapas, tostiones (baches) y pagos (abonos).
-- No borra datos: renombra la tabla, agrega columnas opcionales y crea tablas nuevas.
-- Los registros existentes quedan en etapa "Entregado" y con un pago por su total.

-- ---------- tipos nuevos ----------
create type public.etapa_lote   as enum ('Recibido', 'Trillado', 'Tostado', 'Empacado', 'Entregado');
create type public.llegada_cafe as enum ('Pergamino', 'Verde');
create type public.nivel_tueste as enum ('Claro', 'Medio', 'Oscuro');
create type public.presentacion as enum ('Grano', 'Molido');
create type public.molienda     as enum ('Fino', 'Medio', 'Grueso');

-- ---------- registros → lotes ----------
alter table public.registros rename to lotes;
alter table public.lotes rename constraint registros_pkey to lotes_pkey;
alter table public.lotes rename constraint registros_numero_key to lotes_numero_key;
alter table public.lotes rename constraint registros_cliente_id_fkey to lotes_cliente_id_fkey;
alter index public.registros_fecha_idx   rename to lotes_fecha_idx;
alter index public.registros_cliente_idx rename to lotes_cliente_idx;
alter index public.registros_estado_idx  rename to lotes_estado_idx;
alter trigger registros_updated_at on public.lotes rename to lotes_updated_at;

-- Código L-0001 (mismo número que el R-0001 anterior)
alter table public.lotes drop column codigo;
alter table public.lotes add column codigo text generated always as ('L-' || lpad(numero::text, 4, '0')) stored;

-- La forma de pago pasa a la tabla pagos; la columna queda para los registros viejos
alter table public.lotes alter column pago drop not null;

-- Etapa: los registros existentes ya se entregaron
alter table public.lotes add column etapa public.etapa_lote not null default 'Entregado';
alter table public.lotes alter column etapa set default 'Recibido';
create index lotes_etapa_idx on public.lotes (etapa);

-- Recepción (todo opcional; los registros viejos quedan sin dato)
alter table public.lotes
  add column llegada                 public.llegada_cafe,
  add column humedad_pct             numeric(4, 1) check (humedad_pct between 0 and 100),
  add column nivel_tueste            public.nivel_tueste,
  add column presentacion            public.presentacion,
  add column molienda                public.molienda,
  add column fecha_entrega_prometida date,
  add column foto_bascula_recepcion  text,
  add column observaciones           text check (length(observaciones) <= 500),
  add constraint lotes_molienda_solo_molido check (molienda is null or (presentacion is not null and presentacion = 'Molido'));
alter table public.lotes
  alter column llegada set default 'Pergamino',
  alter column fecha_entrega_prometida set default (current_date + 3);

-- Trilla
alter table public.lotes
  add column kilos_verde       numeric(10, 3) check (kilos_verde >= 0),
  add column kilos_subproducto numeric(10, 3) check (kilos_subproducto >= 0);

-- Empaque
alter table public.lotes add column bolsas_cliente boolean not null default false;

-- Entrega
alter table public.lotes
  add column subproducto_entregado boolean not null default false,
  add column foto_bascula_entrega  text,
  add column entregado_at          timestamptz;

-- Antes: un registro enviado a Siigo no se podía tocar (política de RLS).
-- Ahora el lote sigue avanzando por etapas; solo se bloquea lo que cambia el cobro.
drop policy "equipo edita registros" on public.lotes;
drop policy "equipo borra registros" on public.lotes;
alter policy "equipo lee registros"  on public.lotes rename to "equipo lee lotes";
alter policy "equipo crea registros" on public.lotes rename to "equipo crea lotes";
create policy "equipo edita lotes" on public.lotes for update to authenticated using (true) with check (true);
create policy "equipo borra lotes" on public.lotes for delete to authenticated using (estado <> 'Enviado');

create or replace function public.proteger_cobro_enviado() returns trigger
language plpgsql as $$
begin
  if old.estado = 'Enviado' and (
    (new.cliente_id, new.fecha, new.cliente, new.celular, new.factura, new.tipo_doc, new.num_doc, new.correo,
     new.proceso, new.kilos, new.gramos, new.n340, new.n500, new.n2500, new.bolsas_cliente,
     new.precio_lb, new.precio_340, new.precio_500, new.precio_2500, new.estado)
    is distinct from
    (old.cliente_id, old.fecha, old.cliente, old.celular, old.factura, old.tipo_doc, old.num_doc, old.correo,
     old.proceso, old.kilos, old.gramos, old.n340, old.n500, old.n2500, old.bolsas_cliente,
     old.precio_lb, old.precio_340, old.precio_500, old.precio_2500, old.estado)
  ) then
    raise exception 'Este lote ya está en contabilidad. El cobro no se puede cambiar.';
  end if;
  return new;
end;
$$;

create trigger lotes_proteger_cobro before update on public.lotes
  for each row execute function public.proteger_cobro_enviado();

-- ---------- tostiones (baches) ----------
create table public.tostiones (
  id                     uuid primary key default gen_random_uuid(),
  lote_id                uuid not null references public.lotes (id) on delete cascade,
  user_id                uuid references auth.users (id) on delete set null default auth.uid(),
  gramos_verde_entrada   integer not null check (gramos_verde_entrada > 0),
  gramos_tostado_salida  integer check (gramos_tostado_salida >= 0),
  tiempo_total_min       numeric(5, 2) check (tiempo_total_min >= 0),
  tiempo_desarrollo_min  numeric(5, 2) check (tiempo_desarrollo_min >= 0),
  temp_carga_c           numeric(5, 1),
  archivo_curva          text,
  foto_curva             text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index tostiones_lote_idx on public.tostiones (lote_id);

create trigger tostiones_updated_at before update on public.tostiones
  for each row execute function public.tocar_updated_at();

alter table public.tostiones enable row level security;

create policy "equipo lee tostiones"   on public.tostiones for select to authenticated using (true);
create policy "equipo crea tostiones"  on public.tostiones for insert to authenticated with check (true);
create policy "equipo edita tostiones" on public.tostiones for update to authenticated using (true) with check (true);
create policy "equipo borra tostiones" on public.tostiones for delete to authenticated using (true);

-- ---------- pagos (abonos) ----------
create table public.pagos (
  id          uuid primary key default gen_random_uuid(),
  -- restrict: un lote con abonos no se borra por accidente
  lote_id     uuid not null references public.lotes (id) on delete restrict,
  user_id     uuid references auth.users (id) on delete set null default auth.uid(),
  fecha       date not null default current_date,
  valor       integer not null check (valor > 0),
  metodo      public.forma_pago not null,
  created_at  timestamptz not null default now()
);

create index pagos_lote_idx  on public.pagos (lote_id);
create index pagos_fecha_idx on public.pagos (fecha desc);

alter table public.pagos enable row level security;

create policy "equipo lee pagos"   on public.pagos for select to authenticated using (true);
create policy "equipo crea pagos"  on public.pagos for insert to authenticated with check (true);
create policy "equipo edita pagos" on public.pagos for update to authenticated using (true) with check (true);
create policy "equipo borra pagos" on public.pagos for delete to authenticated using (true);

-- Registros viejos: un pago por el total cobrado (tostión + bolsas), con su forma de pago y fecha
insert into public.pagos (lote_id, user_id, fecha, valor, metodo, created_at)
select l.id, l.user_id, l.fecha,
       round(l.gramos::numeric / 500 * l.precio_lb
             + l.n340 * l.precio_340 + l.n500 * l.precio_500 + l.n2500 * l.precio_2500),
       l.pago, l.created_at
from public.lotes l
where l.pago is not null
  and not exists (select 1 from public.pagos p where p.lote_id = l.id);

-- ---------- configuración: rangos de alerta y costo de gas ----------
alter table public.configuracion
  add column humedad_min   numeric(4, 1) not null default 10,
  add column humedad_max   numeric(4, 1) not null default 12,
  add column trilla_min    numeric(4, 1) not null default 15,
  add column trilla_max    numeric(4, 1) not null default 25,
  add column merma_min     numeric(4, 1) not null default 12,
  add column merma_max     numeric(4, 1) not null default 20,
  add column gas_por_bache integer check (gas_por_bache >= 0),
  add constraint configuracion_rangos check (humedad_min <= humedad_max and trilla_min <= trilla_max and merma_min <= merma_max);

-- ---------- archivos (fotos de báscula, curvas de Artisan) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lotes', 'lotes', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'text/plain', 'application/octet-stream'])
on conflict (id) do nothing;

create policy "equipo lee archivos de lotes"   on storage.objects for select to authenticated using (bucket_id = 'lotes');
create policy "equipo sube archivos de lotes"  on storage.objects for insert to authenticated with check (bucket_id = 'lotes');
create policy "equipo cambia archivos de lotes" on storage.objects for update to authenticated using (bucket_id = 'lotes');
create policy "equipo borra archivos de lotes" on storage.objects for delete to authenticated using (bucket_id = 'lotes');

-- ---------- tiempo real ----------
alter publication supabase_realtime add table public.tostiones, public.pagos;

-- ---------- compatibilidad ----------
-- Si la versión anterior de la app sigue abierta en algún celular, sigue funcionando sobre "lotes".
-- Borrar cuando todos usen la versión nueva:  drop view public.registros;
create view public.registros with (security_invoker = true) as
  select id, numero, codigo, user_id, cliente_id, fecha, cliente, celular, factura, tipo_doc, num_doc, correo,
         pago, proceso, kilos, gramos, n340, n500, n2500, precio_lb, precio_340, precio_500, precio_2500,
         estado, enviado_at, created_at, updated_at
  from public.lotes;
