-- Empaque: drips (con su precio) y peso del café tostado.
-- "Sin bolsa" ya existía (lotes.bolsas_cliente).

-- Precio de los drips en Configuración. Arranca en 0: se pone en la pantalla de Configuración.
alter table public.configuracion
  add column precio_drip integer not null default 0 check (precio_drip >= 0);

alter table public.lotes
  add column n_drip         integer not null default 0 check (n_drip >= 0),
  -- Precio con el que se cobró, como los de las bolsas.
  add column precio_drip    integer not null default 0 check (precio_drip >= 0),
  -- Peso del café tostado al empacar, para la pérdida en el tueste (almendra → tostado).
  add column gramos_tostado integer check (gramos_tostado > 0),
  add constraint lotes_tostado_menor_que_almendra check (gramos_tostado is null or gramos is null or gramos_tostado <= gramos);

-- Los drips cambian el cobro: tampoco se pueden cambiar después de enviar a contabilidad.
create or replace function public.proteger_cobro_enviado() returns trigger
language plpgsql as $$
begin
  if old.estado = 'Enviado' and (
    (new.cliente_id, new.fecha, new.cliente, new.celular, new.factura, new.tipo_doc, new.num_doc, new.correo,
     new.proceso, new.kilos, new.gramos, new.n340, new.n500, new.n2500, new.n_drip, new.bolsas_cliente,
     new.precio_lb, new.precio_340, new.precio_500, new.precio_2500, new.precio_drip, new.estado)
    is distinct from
    (old.cliente_id, old.fecha, old.cliente, old.celular, old.factura, old.tipo_doc, old.num_doc, old.correo,
     old.proceso, old.kilos, old.gramos, old.n340, old.n500, old.n2500, old.n_drip, old.bolsas_cliente,
     old.precio_lb, old.precio_340, old.precio_500, old.precio_2500, old.precio_drip, old.estado)
  ) then
    raise exception 'Este lote ya está en contabilidad. El cobro no se puede cambiar.';
  end if;
  return new;
end;
$$;
