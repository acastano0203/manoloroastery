-- Inventario de bolsas y drips: cuántos hay en bodega.
-- Se fija en Configuración (al contar) y la base lo descuenta sola cada vez que un lote registra bolsas,
-- al recibir o al empacar: si se cambian, descuenta o devuelve la diferencia; si se borra el lote, las devuelve.
-- Las bolsas de "Sin bolsa" (las trae el cliente) no salen de la bodega. Vacío = no se lleva inventario.
-- Puede quedar negativo: es que se usaron más de las contadas y hay que volver a contar.
alter table public.configuracion
  add column stock_340  integer,
  add column stock_500  integer,
  add column stock_2500 integer,
  add column stock_drip integer;

create or replace function public.lotes_descontar_bolsas() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  -- Lo que vuelve a la bodega (positivo) o sale de ella (negativo).
  d340 integer := 0; d500 integer := 0; d2500 integer := 0; ddrip integer := 0;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    if not old.bolsas_cliente then
      d340 := d340 + old.n340; d500 := d500 + old.n500; d2500 := d2500 + old.n2500;
    end if;
    ddrip := ddrip + old.n_drip;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    if not new.bolsas_cliente then
      d340 := d340 - new.n340; d500 := d500 - new.n500; d2500 := d2500 - new.n2500;
    end if;
    ddrip := ddrip - new.n_drip;
  end if;
  if d340 <> 0 or d500 <> 0 or d2500 <> 0 or ddrip <> 0 then
    -- Si no se lleva inventario de algo (vacío), sigue vacío.
    update public.configuracion set
      stock_340 = stock_340 + d340, stock_500 = stock_500 + d500,
      stock_2500 = stock_2500 + d2500, stock_drip = stock_drip + ddrip;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger lotes_descontar_bolsas
  after insert or delete or update of n340, n500, n2500, n_drip, bolsas_cliente on public.lotes
  for each row execute function public.lotes_descontar_bolsas();
