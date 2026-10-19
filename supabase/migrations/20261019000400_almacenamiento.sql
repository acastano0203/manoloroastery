-- Almacenamiento al entregar: si el cliente deja café guardado en la tostadora (1 a 10 días),
-- cuánto se guarda, cómo va marcado y una foto como evidencia.

alter table public.lotes
  add column almacenamiento   boolean not null default false,
  add column almacen_dias     smallint check (almacen_dias between 1 and 10),
  add column almacen_gramos   integer check (almacen_gramos > 0),
  add column almacen_marcado  text check (length(almacen_marcado) between 1 and 300),
  -- Ruta de la foto en la carpeta "lotes".
  add column almacen_foto     text,
  add constraint lotes_almacenamiento_completo check (
    not almacenamiento
    or (almacen_dias is not null and almacen_gramos is not null and almacen_marcado is not null and almacen_foto is not null)
  );

-- Fotos tomadas desde el celular (algunos iPhone las suben en HEIC).
update storage.buckets
set allowed_mime_types = allowed_mime_types || array['image/heic', 'image/heif']
where id = 'lotes' and not ('image/heic' = any (allowed_mime_types));
