-- Densidad del grano al recibirlo, en gramos por litro. Opcional, como la humedad.

alter table public.lotes
  add column densidad_gl numeric(6, 1) check (densidad_gl > 0 and densidad_gl < 2000);
