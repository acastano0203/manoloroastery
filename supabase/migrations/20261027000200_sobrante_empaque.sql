-- Café tostado que sobró al empacar (no cupo en las bolsas). Se le entrega al cliente suelto.
-- Ya está cobrado en la tostión (se cobra todo el café en almendra), así que no suma al cobro.
alter table public.lotes add column gramos_sobrante integer;
alter table public.lotes add constraint lotes_gramos_sobrante_valido
  check (gramos_sobrante is null or (gramos_sobrante >= 0 and (gramos_tostado is null or gramos_sobrante <= gramos_tostado)));
