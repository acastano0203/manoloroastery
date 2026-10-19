-- Fase 2 · El café a tostar se anota al tostar, no al recibir.
-- Las bolsas ya tenían 0 por defecto: se anotan al empacar sin cambios en la tabla.
-- No cambia datos: todos los lotes existentes ya tienen gramos.

alter table public.lotes alter column gramos drop not null;

-- Sin gramos solo puede estar antes de tostar (el cobro de un lote tostado depende de ellos).
alter table public.lotes add constraint lotes_gramos_al_tostar
  check (gramos is not null or etapa in ('Recibido', 'Trillado'));
