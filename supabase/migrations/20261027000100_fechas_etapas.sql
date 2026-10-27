-- Fecha y hora en que el lote llegó a cada etapa: se recibe hoy, se trilla mañana, se tuesta en dos días…
-- { "Recibido": "2026-10-27T09:15:00Z", "Trillado": "2026-10-28T15:40:00Z", ... }
-- La anota la base (trigger), así vale para el botón, el tablero y "Deshacer".
alter table public.lotes add column fechas_etapas jsonb not null default '{}'::jsonb;
alter table public.lotes add constraint lotes_fechas_etapas_objeto check (jsonb_typeof(fechas_etapas) = 'object');

-- Lotes que ya existían: se sabe cuándo se crearon y, si se entregaron, cuándo.
update public.lotes set fechas_etapas = jsonb_strip_nulls(jsonb_build_object(
  'Recibido', created_at,
  'Entregado', case when etapa = 'Entregado' then entregado_at end
));

create or replace function public.lotes_fecha_etapa() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.fechas_etapas := jsonb_build_object(new.etapa::text, now());
  elsif new.etapa is distinct from old.etapa then
    -- Se conservan las etapas anteriores a la nueva. Si avanzó, la nueva se anota ahora;
    -- si se devolvió, las etapas que se deshicieron se borran y la nueva mantiene su hora.
    select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into new.fechas_etapas
      from jsonb_each(old.fechas_etapas) as x(k, v)
      where k::public.etapa_lote < new.etapa or (k::public.etapa_lote = new.etapa and new.etapa < old.etapa);
    if not new.fechas_etapas ? new.etapa::text then
      new.fechas_etapas := new.fechas_etapas || jsonb_build_object(new.etapa::text, now());
    end if;
  else
    -- Nadie más la cambia: se guarda solo al mover de etapa.
    new.fechas_etapas := old.fechas_etapas;
  end if;
  return new;
end;
$$;

create trigger lotes_fecha_etapa before insert or update on public.lotes
  for each row execute function public.lotes_fecha_etapa();
