-- Registro de tostión · Don Manolo
-- Tablas: clientes, registros, configuracion (una sola fila).
-- Acceso: equipo compartido. Todo usuario autenticado ve y edita los mismos datos;
-- user_id guarda quién creó cada fila.

-- ---------- tipos ----------
create type public.tipo_documento as enum ('CC', 'NIT');
create type public.forma_pago     as enum ('Efectivo', 'Banco', 'Bold');
create type public.proceso_cafe   as enum ('Pergamino', 'Natural', 'Honey', 'Cofermentado');
create type public.estado_envio   as enum ('Pendiente', 'Enviando', 'Enviado', 'Error');

-- ---------- updated_at ----------
create or replace function public.tocar_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- clientes ----------
create table public.clientes (
  id          uuid primary key default gen_random_uuid(),
  numero      bigint generated always as identity unique,
  codigo      text generated always as ('C-' || lpad(numero::text, 3, '0')) stored,
  user_id     uuid references auth.users (id) on delete set null default auth.uid(),
  nombre      text not null check (length(trim(nombre)) > 0),
  celular     text not null check (celular ~ '^3[0-9]{9}$'),
  factura     boolean not null default false,
  tipo_doc    public.tipo_documento not null default 'CC',
  num_doc     text not null default '',
  correo      text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index clientes_nombre_unico on public.clientes (lower(trim(nombre)));

create trigger clientes_updated_at before update on public.clientes
  for each row execute function public.tocar_updated_at();

alter table public.clientes enable row level security;

create policy "equipo lee clientes"   on public.clientes for select to authenticated using (true);
create policy "equipo crea clientes"  on public.clientes for insert to authenticated with check (true);
create policy "equipo edita clientes" on public.clientes for update to authenticated using (true) with check (true);
create policy "equipo borra clientes" on public.clientes for delete to authenticated using (true);

-- ---------- registros ----------
create table public.registros (
  id           uuid primary key default gen_random_uuid(),
  numero       bigint generated always as identity unique,
  codigo       text generated always as ('R-' || lpad(numero::text, 4, '0')) stored,
  user_id      uuid references auth.users (id) on delete set null default auth.uid(),
  cliente_id   uuid not null references public.clientes (id) on delete restrict,
  fecha        date not null default current_date,
  -- Copia de los datos del cliente al guardar (la remisión no cambia si después se edita el cliente)
  cliente      text not null,
  celular      text not null check (celular ~ '^3[0-9]{9}$'),
  factura      boolean not null default false,
  tipo_doc     public.tipo_documento not null default 'CC',
  num_doc      text not null default '',
  correo       text not null default '',
  pago         public.forma_pago not null,
  proceso      public.proceso_cafe not null,
  kilos        numeric(10, 3) not null check (kilos > 0),
  gramos       integer not null check (gramos > 0),
  n340         integer not null default 0 check (n340 >= 0),
  n500         integer not null default 0 check (n500 >= 0),
  n2500        integer not null default 0 check (n2500 >= 0),
  -- Precios vigentes al guardar (los totales ya cobrados no cambian si luego se editan los precios)
  precio_lb    integer not null check (precio_lb > 0),
  precio_340   integer not null check (precio_340 >= 0),
  precio_500   integer not null check (precio_500 >= 0),
  precio_2500  integer not null check (precio_2500 >= 0),
  estado       public.estado_envio not null default 'Pendiente',
  enviado_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index registros_fecha_idx   on public.registros (fecha desc);
create index registros_cliente_idx on public.registros (cliente_id);
create index registros_estado_idx  on public.registros (estado);

create trigger registros_updated_at before update on public.registros
  for each row execute function public.tocar_updated_at();

alter table public.registros enable row level security;

create policy "equipo lee registros"   on public.registros for select to authenticated using (true);
create policy "equipo crea registros"  on public.registros for insert to authenticated with check (true);
-- Un registro enviado ya está en contabilidad: solo se puede editar mientras no se haya enviado
create policy "equipo edita registros" on public.registros for update to authenticated
  using (estado <> 'Enviado') with check (true);
create policy "equipo borra registros" on public.registros for delete to authenticated
  using (estado <> 'Enviado');

-- ---------- configuracion (una sola fila) ----------
create table public.configuracion (
  id             uuid primary key default gen_random_uuid(),
  unica          boolean not null default true unique check (unica),
  precio_lb      integer not null default 3000 check (precio_lb > 0),
  precio_340     integer not null default 1500 check (precio_340 >= 0),
  precio_500     integer not null default 1800 check (precio_500 >= 0),
  precio_2500    integer not null default 4000 check (precio_2500 >= 0),
  -- La llave de acceso de Siigo NO se guarda aquí: va como secreto de una Edge Function
  siigo_usuario  text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

insert into public.configuracion default values;

create trigger configuracion_updated_at before update on public.configuracion
  for each row execute function public.tocar_updated_at();

alter table public.configuracion enable row level security;

create policy "equipo lee configuracion"   on public.configuracion for select to authenticated using (true);
create policy "equipo edita configuracion" on public.configuracion for update to authenticated using (true) with check (true);

-- ---------- tiempo real (escritorio y celular se mantienen sincronizados) ----------
alter publication supabase_realtime add table public.clientes, public.registros, public.configuracion;
