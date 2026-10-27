-- Descripción libre de cada etapa del lote (cómo salió la trilla, observaciones de la tostión, etc.).
-- Un texto por etapa: { "Trillado": "...", "Tostado": "..." }.
alter table public.lotes add column descripciones jsonb not null default '{}'::jsonb;
alter table public.lotes add constraint lotes_descripciones_objeto check (jsonb_typeof(descripciones) = 'object');
