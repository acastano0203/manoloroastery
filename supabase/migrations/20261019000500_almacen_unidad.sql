-- Unidad en la que se anotó la cantidad almacenada (g, kg o lb). La cantidad sigue guardada en gramos.

alter table public.lotes
  add column almacen_unidad text not null default 'g' check (almacen_unidad in ('g', 'kg', 'lb'));
