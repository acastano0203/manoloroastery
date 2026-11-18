-- Venta en Siigo al enviar un lote entregado (Edge Function "siigo").
-- El producto y el cliente ya existen en Siigo: solo se crea (o actualiza) la factura de venta con las libras
-- tostadas, las bolsas y los drips. Las bolsas facturadas salen del inventario de Siigo, igual que de la bodega de la app.
-- Impuestos y DIAN los maneja Siigo. Los ids de la factura van como secretos de la función, no en la base.

-- Lo que quedó en Siigo de cada lote.
alter table public.lotes
  add column siigo_factura_id text,          -- id (GUID) de la factura en Siigo: al reenviar se actualiza esa misma
  add column siigo_factura    text,          -- nombre de la factura, p. ej. FV-1-123
  add column siigo_error      text,          -- motivo del último error al enviar
  add column siigo_bolsas     jsonb;         -- bolsas y drips que lleva la factura: { "n340": 2, "n500": 0, "n2500": 0, "nDrip": 5 }

-- Los datos de Siigo solo los escribe la Edge Function (llave de servicio, sin sesión de usuario).
create or replace function public.proteger_datos_siigo() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and (
    (new.siigo_factura_id, new.siigo_factura, new.siigo_error, new.siigo_bolsas)
    is distinct from (old.siigo_factura_id, old.siigo_factura, old.siigo_error, old.siigo_bolsas)
  ) then
    raise exception 'Los datos de Siigo solo los cambia el envío a Siigo.';
  end if;
  return new;
end;
$$;

create trigger lotes_proteger_datos_siigo before update on public.lotes
  for each row execute function public.proteger_datos_siigo();
