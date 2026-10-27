-- Permiso "reportes": la pantalla de reportes (kilos en proceso, atrasos y gráficas del período).
-- Los reportes salen de los lotes, así que quien tiene este permiso también puede leerlos (no cambiarlos).
alter table public.rol_permisos drop constraint if exists rol_permisos_permiso_check;
alter table public.rol_permisos add constraint rol_permisos_permiso_check
  check (permiso in ('tablero', 'nuevo_lote', 'curvas', 'historial', 'clientes', 'configuracion', 'reportes'));

create or replace function public.ve_lotes() returns boolean
language sql stable as $$
  select public.tiene_permiso('tablero') or public.tiene_permiso('historial')
      or public.tiene_permiso('nuevo_lote') or public.tiene_permiso('curvas') or public.tiene_permiso('reportes');
$$;
