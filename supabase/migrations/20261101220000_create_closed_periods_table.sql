-- =========================================================================
-- MIGRACIÓN: 20261101220000_create_closed_periods_table.sql
-- DESCRIPCIÓN: Períodos mensuales cerrados para bloquear modificaciones
--              de transacciones y presupuestos del mes.
-- =========================================================================

create table if not exists public.closed_periods (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  period text not null, -- Formato: 'YYYY-MM'
  closed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, period)
);

create index if not exists closed_periods_user_id_idx on public.closed_periods(user_id);

alter table public.closed_periods enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'closed_periods'
      and policyname = 'Usuarios pueden ver sus propios periodos cerrados'
  ) then
    create policy "Usuarios pueden ver sus propios periodos cerrados"
      on public.closed_periods for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'closed_periods'
      and policyname = 'Usuarios pueden gestionar sus propios periodos cerrados'
  ) then
    create policy "Usuarios pueden gestionar sus propios periodos cerrados"
      on public.closed_periods for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;
