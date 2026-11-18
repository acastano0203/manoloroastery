-- Ajustes de Siigo editables desde la app (Configuración › Siigo), en vez de secretos de la Edge Function.
-- No son secretos: son ids y códigos de Siigo. El usuario API y la llave siguen solo en los secretos de la función.
-- (Las columnas de bolsas por tamaño se quitan en 20261118000000_siigo_bolsas_lote.sql: las bolsas salen de Siigo.)

alter table public.configuracion
  add column siigo_cotizacion_id     integer check (siigo_cotizacion_id > 0),  -- comprobante de cotización (GET /v1/document-types?type=C)
  add column siigo_vendedor_id       integer check (siigo_vendedor_id > 0),    -- vendedor (GET /v1/users)
  add column siigo_producto_tostion  text not null default '',                 -- código del producto de torrefacción (por libra)
  add column siigo_producto_340      text not null default '',
  add column siigo_producto_500      text not null default '',
  add column siigo_producto_2500     text not null default '',
  add column siigo_producto_drip     text not null default '',
  add column siigo_consumidor_final  text not null default '222222222222',     -- cliente de las ventas sin factura a nombre propio
  -- Clientes que no existen en Siigo: se crean al enviar. Siigo exige dirección y ciudad, y la app no las pide:
  -- se usan estas (códigos DANE: departamento de 2 dígitos y ciudad de 5, p. ej. 05 y 05001 para Medellín).
  add column siigo_crear_clientes    boolean not null default true,
  add column siigo_direccion         text not null default '',
  add column siigo_departamento      text not null default '' check (siigo_departamento ~ '^([0-9]{2})?$'),
  add column siigo_ciudad            text not null default '' check (siigo_ciudad ~ '^([0-9]{5})?$');
-- siigo_usuario ya no se usa (el usuario API vive en los secretos), pero se deja: la versión publicada de la app aún lo guarda.
