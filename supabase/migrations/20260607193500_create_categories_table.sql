-- =========================================================================
-- MIGRACIÓN: 20260607193500_create_categories_table.sql
-- DESCRIPCIÓN: Creación de la tabla de categorías con soporte para
--              presupuesto plantilla (default_budget) y políticas RLS.
-- =========================================================================

-- 1. Crear tabla si no existe
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, name, type)
);

-- 2. Asegurar que la columna default_budget exista si la tabla ya había sido creada anteriormente
alter table public.categories add column if not exists default_budget numeric(12,2) default 0.00 not null;

-- 3. Crear índice para optimizar búsquedas por usuario
create index if not exists categories_user_id_idx on public.categories(user_id);

-- 4. Habilitar Seguridad a Nivel de Fila (RLS)
alter table public.categories enable row level security;

-- 5. Crear políticas de seguridad RLS
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'categories' and policyname = 'Usuarios pueden ver sus propias categorias'
  ) then
    create policy "Usuarios pueden ver sus propias categorias" 
      on public.categories for select 
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'categories' and policyname = 'Usuarios pueden gestionar sus propias categorias'
  ) then
    create policy "Usuarios pueden gestionar sus propias categorias" 
      on public.categories for all 
      using (auth.uid() = user_id);
  end if;
end
$$;
