-- Permiso "administracion": un rol que no es el Administrador puede entrar a Administración
-- (crear usuarios, asignarles rol y armar roles), sin ver por eso todas las pantallas.
-- Lo que solo hace el Administrador de verdad (así nadie se sube de rango solo):
--   · dar o quitar el permiso de Administración a un rol,
--   · poner o quitar el rol Administrador a un usuario.
alter table public.rol_permisos drop constraint if exists rol_permisos_permiso_check;
alter table public.rol_permisos add constraint rol_permisos_permiso_check
  check (permiso in ('tablero', 'nuevo_lote', 'curvas', 'historial', 'clientes', 'configuracion', 'reportes', 'administracion'));

-- Quien puede usar Administración: el Administrador o un rol con ese permiso.
create or replace function public.administra() returns boolean
language sql stable security definer set search_path = public as $$
  select public.tiene_permiso('administracion');
$$;

drop policy "admin crea roles" on public.roles;
drop policy "admin edita roles" on public.roles;
drop policy "admin borra roles" on public.roles;
create policy "admin crea roles"  on public.roles for insert to authenticated with check (public.administra());
create policy "admin edita roles" on public.roles for update to authenticated using (public.administra()) with check (public.administra());
create policy "admin borra roles" on public.roles for delete to authenticated using (public.administra());

drop policy "admin asigna permisos" on public.rol_permisos;
drop policy "admin quita permisos" on public.rol_permisos;
create policy "admin asigna permisos" on public.rol_permisos for insert to authenticated
  with check (public.administra() and (permiso <> 'administracion' or public.es_admin()));
create policy "admin quita permisos" on public.rol_permisos for delete to authenticated
  using (public.administra() and (permiso <> 'administracion' or public.es_admin()));

drop policy "cada uno ve su perfil" on public.perfiles;
drop policy "admin edita perfiles" on public.perfiles;
create policy "cada uno ve su perfil" on public.perfiles for select to authenticated using (id = auth.uid() or public.administra());
create policy "admin edita perfiles"  on public.perfiles for update to authenticated using (public.administra()) with check (public.administra());

-- Poner o quitar el rol Administrador: solo un Administrador (o el servidor, sin sesión: la función crear-usuario).
create or replace function public.proteger_rol_administrador() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rol_admin uuid := (select id from public.roles where administrador);
begin
  if auth.uid() is not null and not public.es_admin()
     and new.rol_id is distinct from old.rol_id
     and (old.rol_id = rol_admin or new.rol_id = rol_admin) then
    raise exception 'Solo un administrador puede poner o quitar el rol Administrador.';
  end if;
  return new;
end;
$$;
create trigger perfiles_proteger_rol_administrador before update on public.perfiles
  for each row execute function public.proteger_rol_administrador();
