-- Roles y permisos.
-- Cada usuario tiene un rol; cada rol ve unas pantallas (permisos). El rol Administrador ve todo y administra roles y usuarios.
-- Las reglas también se cumplen en la base de datos: se agregan políticas RESTRICTIVAS encima de las que ya había.

-- ---------- tablas ----------
create table public.roles (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null unique check (length(trim(nombre)) between 1 and 40),
  -- El rol Administrador: ve todo, no se borra. Solo puede haber uno.
  administrador  boolean not null default false,
  created_at     timestamptz not null default now()
);
create unique index roles_un_administrador on public.roles (administrador) where administrador;

create table public.rol_permisos (
  rol_id   uuid not null references public.roles (id) on delete cascade,
  permiso  text not null check (permiso in ('tablero', 'nuevo_lote', 'curvas', 'historial', 'clientes', 'configuracion')),
  primary key (rol_id, permiso)
);

create table public.perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  correo      text,
  nombre      text check (length(nombre) <= 80),
  -- Sin rol: no ve nada hasta que un administrador le asigne uno.
  rol_id      uuid references public.roles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------- roles iniciales ----------
insert into public.roles (nombre, administrador) values ('Administrador', true), ('Tostador', false), ('Auxiliar', false);
insert into public.rol_permisos (rol_id, permiso)
select r.id, p from public.roles r, unnest(array['tablero', 'curvas']) p where r.nombre = 'Tostador'
union all
select r.id, p from public.roles r, unnest(array['tablero', 'nuevo_lote', 'historial', 'clientes']) p where r.nombre = 'Auxiliar';

-- Los usuarios que ya existen quedan como administradores (hoy todos ven todo): nadie pierde acceso.
insert into public.perfiles (id, correo, rol_id)
select u.id, u.email, (select id from public.roles where administrador) from auth.users u
on conflict (id) do nothing;

-- Cada usuario nuevo de Supabase Auth tiene su perfil, sin rol.
create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, correo) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end;
$$;
create trigger auth_users_crear_perfil after insert on auth.users
  for each row execute function public.crear_perfil();

-- ---------- funciones de permiso (las usan las políticas) ----------
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfiles p join public.roles r on r.id = p.rol_id
    where p.id = auth.uid() and r.administrador
  );
$$;

create or replace function public.tiene_permiso(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_admin() or exists (
    select 1 from public.perfiles pf join public.rol_permisos rp on rp.rol_id = pf.rol_id
    where pf.id = auth.uid() and rp.permiso = p
  );
$$;

create or replace function public.tiene_rol() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol_id is not null);
$$;

-- Ver lotes: cualquiera que trabaje con ellos.
create or replace function public.ve_lotes() returns boolean
language sql stable as $$
  select public.tiene_permiso('tablero') or public.tiene_permiso('historial')
      or public.tiene_permiso('nuevo_lote') or public.tiene_permiso('curvas');
$$;

-- ---------- protecciones ----------
-- Siempre queda al menos un administrador.
create or replace function public.mantener_un_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.perfiles p join public.roles r on r.id = p.rol_id where r.administrador) then
    raise exception 'Debe quedar al menos un administrador.';
  end if;
  return null;
end;
$$;
create trigger perfiles_mantener_un_admin after update or delete on public.perfiles
  for each statement execute function public.mantener_un_admin();

-- El rol Administrador no se borra ni deja de serlo.
create or replace function public.proteger_rol_admin() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' and old.administrador then raise exception 'El rol Administrador no se puede eliminar.'; end if;
  if tg_op = 'UPDATE' and old.administrador <> new.administrador then raise exception 'El rol Administrador no se puede cambiar.'; end if;
  return coalesce(new, old);
end;
$$;
create trigger roles_proteger_admin before update or delete on public.roles
  for each row execute function public.proteger_rol_admin();

-- ---------- RLS de las tablas nuevas ----------
alter table public.roles enable row level security;
alter table public.rol_permisos enable row level security;
alter table public.perfiles enable row level security;

create policy "todos leen roles"        on public.roles for select to authenticated using (true);
create policy "admin crea roles"        on public.roles for insert to authenticated with check (public.es_admin());
create policy "admin edita roles"       on public.roles for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "admin borra roles"       on public.roles for delete to authenticated using (public.es_admin());

create policy "todos leen permisos"     on public.rol_permisos for select to authenticated using (true);
create policy "admin asigna permisos"   on public.rol_permisos for insert to authenticated with check (public.es_admin());
create policy "admin quita permisos"    on public.rol_permisos for delete to authenticated using (public.es_admin());

create policy "cada uno ve su perfil"   on public.perfiles for select to authenticated using (id = auth.uid() or public.es_admin());
create policy "admin edita perfiles"    on public.perfiles for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- ---------- permisos sobre los datos (restrictivas: se suman a las que había) ----------
create policy "rol: ve lotes"        on public.lotes as restrictive for select to authenticated using (public.ve_lotes());
create policy "rol: crea lotes"      on public.lotes as restrictive for insert to authenticated with check (public.tiene_permiso('nuevo_lote'));
create policy "rol: mueve lotes"     on public.lotes as restrictive for update to authenticated
  using (public.tiene_permiso('tablero') or public.tiene_permiso('nuevo_lote') or public.tiene_permiso('historial'))
  with check (public.tiene_permiso('tablero') or public.tiene_permiso('nuevo_lote') or public.tiene_permiso('historial'));
create policy "rol: borra lotes"     on public.lotes as restrictive for delete to authenticated using (public.tiene_permiso('nuevo_lote'));

create policy "rol: ve pagos"        on public.pagos as restrictive for select to authenticated using (public.ve_lotes());
create policy "rol: crea pagos"      on public.pagos as restrictive for insert to authenticated with check (public.tiene_permiso('tablero') or public.tiene_permiso('nuevo_lote'));
create policy "rol: edita pagos"     on public.pagos as restrictive for update to authenticated using (public.tiene_permiso('tablero') or public.tiene_permiso('nuevo_lote'));
create policy "rol: borra pagos"     on public.pagos as restrictive for delete to authenticated using (public.tiene_permiso('tablero') or public.tiene_permiso('nuevo_lote'));

create policy "rol: ve tostiones"    on public.tostiones as restrictive for select to authenticated using (public.ve_lotes());
create policy "rol: crea tostiones"  on public.tostiones as restrictive for insert to authenticated with check (public.tiene_permiso('curvas'));
create policy "rol: edita tostiones" on public.tostiones as restrictive for update to authenticated using (public.tiene_permiso('curvas'));
create policy "rol: borra tostiones" on public.tostiones as restrictive for delete to authenticated using (public.tiene_permiso('curvas'));

create policy "rol: ve lecturas"     on public.tostion_lecturas as restrictive for select to authenticated using (public.ve_lotes());
create policy "rol: crea lecturas"   on public.tostion_lecturas as restrictive for insert to authenticated with check (public.tiene_permiso('curvas'));
create policy "rol: edita lecturas"  on public.tostion_lecturas as restrictive for update to authenticated using (public.tiene_permiso('curvas'));
create policy "rol: borra lecturas"  on public.tostion_lecturas as restrictive for delete to authenticated using (public.tiene_permiso('curvas'));

-- Clientes: los ve cualquiera con rol; se crean o cambian desde Clientes o al crear un lote.
create policy "rol: ve clientes"     on public.clientes as restrictive for select to authenticated using (public.tiene_rol());
create policy "rol: crea clientes"   on public.clientes as restrictive for insert to authenticated with check (public.tiene_permiso('clientes') or public.tiene_permiso('nuevo_lote'));
create policy "rol: edita clientes"  on public.clientes as restrictive for update to authenticated using (public.tiene_permiso('clientes') or public.tiene_permiso('nuevo_lote'));
create policy "rol: borra clientes"  on public.clientes as restrictive for delete to authenticated using (public.tiene_permiso('clientes'));

-- Configuración: la leen todos (precios para los lotes nuevos); solo la cambia quien tenga el permiso.
create policy "rol: ve configuracion"    on public.configuracion as restrictive for select to authenticated using (public.tiene_rol());
create policy "rol: edita configuracion" on public.configuracion as restrictive for update to authenticated using (public.tiene_permiso('configuracion'));

-- Archivos (fotos y PDF de los lotes).
create policy "rol: ve archivos"     on storage.objects as restrictive for select to authenticated
  using (bucket_id <> 'lotes' or public.ve_lotes());
create policy "rol: sube archivos"   on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'lotes' or public.tiene_permiso('curvas') or public.tiene_permiso('tablero'));
create policy "rol: borra archivos"  on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'lotes' or public.tiene_permiso('curvas') or public.tiene_permiso('tablero'));

alter publication supabase_realtime add table public.perfiles, public.roles, public.rol_permisos;
