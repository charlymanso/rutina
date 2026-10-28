-- Pega esto entero en Supabase > SQL Editor > New query > Run.
-- Una fila por persona con todo su plan. Las reglas (RLS) hacen que cada cuenta solo vea y toque lo suyo.

create table if not exists public.datos (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  contenido   jsonb not null check (pg_column_size(contenido) < 2000000),
  actualizado timestamptz not null default now()
);

alter table public.datos enable row level security;

create policy datos_ver     on public.datos for select using (auth.uid() = user_id);
create policy datos_crear   on public.datos for insert with check (auth.uid() = user_id);
create policy datos_cambiar on public.datos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy datos_borrar  on public.datos for delete using (auth.uid() = user_id);

-- La hora de "actualizado" la pone el servidor, así no depende del reloj de cada ordenador.
create or replace function public.tocar_actualizado() returns trigger language plpgsql as $$
begin new.actualizado = now(); return new; end $$;

create trigger datos_actualizado before update on public.datos
  for each row execute function public.tocar_actualizado();
