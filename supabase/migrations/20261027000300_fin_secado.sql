-- Fin de secado (cuando el grano se pone amarillo), en segundos desde la carga.
-- Con él, el 1er crack y el fin de la curva salen las tres fases: secado, Maillard y desarrollo.
alter table public.tostiones add column secado_seg integer;
alter table public.tostiones
  add constraint tostiones_secado_antes_de_crack check (secado_seg is null or crack_seg is null or secado_seg <= crack_seg),
  add constraint tostiones_secado_antes_de_descarga check (secado_seg is null or descarga_seg is null or secado_seg <= descarga_seg);
