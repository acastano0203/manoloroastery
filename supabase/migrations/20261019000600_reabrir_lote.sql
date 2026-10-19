-- Reabrir un lote ya enviado a contabilidad: vuelve a "Pendiente" (en Entregado) para modificarlo y enviarlo otra vez.
-- La única excepción al bloqueo es ese cambio de estado, solo: el cobro no puede cambiar en la misma operación.

alter table public.lotes add column reabierto_at timestamptz;

create or replace function public.proteger_cobro_enviado() returns trigger
language plpgsql as $$
begin
  if old.estado = 'Enviado' and (
    (new.cliente_id, new.fecha, new.cliente, new.celular, new.factura, new.tipo_doc, new.num_doc, new.correo,
     new.proceso, new.kilos, new.gramos, new.n340, new.n500, new.n2500, new.n_drip, new.bolsas_cliente,
     new.precio_lb, new.precio_340, new.precio_500, new.precio_2500, new.precio_drip)
    is distinct from
    (old.cliente_id, old.fecha, old.cliente, old.celular, old.factura, old.tipo_doc, old.num_doc, old.correo,
     old.proceso, old.kilos, old.gramos, old.n340, old.n500, old.n2500, old.n_drip, old.bolsas_cliente,
     old.precio_lb, old.precio_340, old.precio_500, old.precio_2500, old.precio_drip)
    -- El estado solo puede pasar de Enviado a Pendiente (reabrir).
    or (new.estado is distinct from old.estado and new.estado <> 'Pendiente')
  ) then
    raise exception 'Este lote ya está en contabilidad. El cobro no se puede cambiar.';
  end if;
  return new;
end;
$$;
