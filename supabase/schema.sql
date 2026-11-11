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

-- Copias automáticas: antes del primer cambio de cada día se guarda cómo estaban los datos; se conservan 14 días.
create table if not exists public.copias (
  user_id uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  contenido jsonb not null,
  creado timestamptz not null default now(),
  primary key (user_id, dia)
);
alter table public.copias enable row level security;
create policy "copias: leer las mias" on public.copias for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.copias from anon;
revoke insert, update, delete, truncate on public.copias from authenticated;
grant select on public.copias to authenticated;
create or replace function public.guardar_copia_diaria() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.contenido is distinct from old.contenido then
    insert into public.copias (user_id, dia, contenido) values (old.user_id, (now() at time zone 'utc')::date, old.contenido)
      on conflict (user_id, dia) do nothing;
    delete from public.copias where user_id = old.user_id and dia < (now() at time zone 'utc')::date - 14;
  end if;
  return new;
end $$;
revoke all on function public.guardar_copia_diaria() from public, anon, authenticated;
drop trigger if exists copia_diaria on public.datos;
create trigger copia_diaria before update on public.datos for each row execute function public.guardar_copia_diaria();
