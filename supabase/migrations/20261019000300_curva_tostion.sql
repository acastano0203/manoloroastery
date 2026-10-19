-- Curva de tostión.
-- Manual: lecturas minuto a minuto (temperatura de grano y de tambor, aire y llama) y los momentos clave.
-- Automática: el PDF que exporta el software del tostador, guardado en la carpeta "lotes".

alter table public.tostiones
  add column origen        text not null default 'manual' check (origen in ('manual', 'automatica')),
  -- Cuándo arrancó el cronómetro (se ve igual en todos los dispositivos).
  add column iniciada_at   timestamptz,
  add column aire_inicial  smallint check (aire_inicial in (0, 25, 50, 75, 100)),
  add column llama_inicial smallint check (llama_inicial between 0 and 100),
  -- Segundos desde la carga: primer crack (pop) y descarga. Una tostión se registra hasta el minuto 30.
  add column crack_seg     integer check (crack_seg between 0 and 1800),
  add column descarga_seg  integer check (descarga_seg between 0 and 1800),
  add column notas         text check (length(notas) <= 500),
  add constraint tostiones_crack_antes_de_descarga check (crack_seg is null or descarga_seg is null or crack_seg <= descarga_seg);

create table public.tostion_lecturas (
  id          uuid primary key default gen_random_uuid(),
  tostion_id  uuid not null references public.tostiones (id) on delete cascade,
  segundo     integer not null check (segundo between 0 and 1800),
  temp_grano  numeric(5, 1) check (temp_grano between -50 and 400),
  temp_tambor numeric(5, 1) check (temp_tambor between -50 and 400),
  aire        smallint check (aire in (0, 25, 50, 75, 100)),
  llama       smallint check (llama between 0 and 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Una lectura por momento: volver a registrar el mismo minuto la corrige.
  unique (tostion_id, segundo)
);

create trigger tostion_lecturas_updated_at before update on public.tostion_lecturas
  for each row execute function public.tocar_updated_at();

alter table public.tostion_lecturas enable row level security;

create policy "equipo lee lecturas"   on public.tostion_lecturas for select to authenticated using (true);
create policy "equipo crea lecturas"  on public.tostion_lecturas for insert to authenticated with check (true);
create policy "equipo edita lecturas" on public.tostion_lecturas for update to authenticated using (true) with check (true);
create policy "equipo borra lecturas" on public.tostion_lecturas for delete to authenticated using (true);

alter publication supabase_realtime add table public.tostion_lecturas;

-- La carpeta "lotes" ahora también guarda los PDF de las curvas automáticas.
update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'application/pdf')
where id = 'lotes' and not ('application/pdf' = any (allowed_mime_types));
