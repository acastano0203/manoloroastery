-- El código del lote se puede escribir: el cliente puede traer el nombre de su lote desde la finca.
-- Si no lo trae (o se borra), queda el consecutivo de siempre: L-0013.
alter table public.lotes alter column codigo drop expression;

create or replace function public.lotes_codigo_por_defecto() returns trigger
language plpgsql as $$
begin
  new.codigo := nullif(btrim(new.codigo), '');
  if new.codigo is null then
    new.codigo := 'L-' || lpad(new.numero::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger lotes_codigo before insert or update of codigo on public.lotes
  for each row execute function public.lotes_codigo_por_defecto();

alter table public.lotes alter column codigo set not null;
alter table public.lotes add constraint lotes_codigo_largo check (char_length(codigo) <= 40);
