-- Las bolsas del lote se eligen de los productos de Siigo (con su precio de Siigo), al recibir y al empacar.
-- En la configuración solo queda lo fijo: el servicio de torrefacción (STORRE) y el cliente.

-- Tolerante: la base puede venir con cualquiera de las dos versiones de 20261117000000_siigo_ajustes
-- (con o sin las columnas de bolsas por tamaño). Solo agrega o quita lo que haga falta.

-- ---------- configuración: lo fijo de Siigo, sin bolsas por tamaño ----------
alter table public.configuracion
  drop column if exists siigo_producto_340,
  drop column if exists siigo_producto_500,
  drop column if exists siigo_producto_2500,
  drop column if exists siigo_producto_drip,
  add column if not exists siigo_producto_tostion  text not null default 'STORRE',
  add column if not exists siigo_cotizacion_id     integer check (siigo_cotizacion_id > 0),
  add column if not exists siigo_vendedor_id       integer check (siigo_vendedor_id > 0),
  add column if not exists siigo_consumidor_final  text not null default '222222222222',
  add column if not exists siigo_crear_clientes    boolean not null default true,
  add column if not exists siigo_direccion         text not null default '',
  add column if not exists siigo_departamento      text not null default '' check (siigo_departamento ~ '^([0-9]{2})?$'),
  add column if not exists siigo_ciudad            text not null default '' check (siigo_ciudad ~ '^([0-9]{5})?$');

alter table public.configuracion alter column siigo_producto_tostion set default 'STORRE';
update public.configuracion set siigo_producto_tostion = 'STORRE' where siigo_producto_tostion = '';

-- ---------- bolsas del lote: productos de Siigo ----------
-- Cada bolsa o drip que se elige, con el código, nombre y precio que tenía en Siigo:
--   [{ "codigo": "ME05", "nombre": "BOLSA 340GR CON VALVULA 4 P", "cantidad": 2, "precio": 1500 }]
-- Las columnas n340, n500, n2500 y n_drip quedan solo para los lotes de antes.
alter table public.lotes
  add column if not exists bolsas jsonb not null default '[]' check (jsonb_typeof(bolsas) = 'array');

-- Un lote enviado no cambia su cobro: ahora también cuentan las bolsas de Siigo.
create or replace function public.proteger_cobro_enviado() returns trigger
language plpgsql as $$
begin
  if old.estado = 'Enviado' and (
    (new.cliente_id, new.fecha, new.cliente, new.celular, new.factura, new.tipo_doc, new.num_doc, new.correo,
     new.proceso, new.kilos, new.gramos, new.n340, new.n500, new.n2500, new.n_drip, new.bolsas_cliente, new.bolsas,
     new.precio_lb, new.precio_340, new.precio_500, new.precio_2500, new.precio_drip)
    is distinct from
    (old.cliente_id, old.fecha, old.cliente, old.celular, old.factura, old.tipo_doc, old.num_doc, old.correo,
     old.proceso, old.kilos, old.gramos, old.n340, old.n500, old.n2500, old.n_drip, old.bolsas_cliente, old.bolsas,
     old.precio_lb, old.precio_340, old.precio_500, old.precio_2500, old.precio_drip)
    -- El estado solo puede pasar de Enviado a Pendiente (reabrir).
    or (new.estado is distinct from old.estado and new.estado <> 'Pendiente')
  ) then
    raise exception 'Este lote ya está en contabilidad. El cobro no se puede cambiar.';
  end if;
  return new;
end;
$$;

-- Que la API vea las columnas nuevas de una vez.
notify pgrst, 'reload schema';
