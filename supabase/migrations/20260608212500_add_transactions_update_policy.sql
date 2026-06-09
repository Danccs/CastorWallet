-- =========================================================================
-- MIGRACIÓN: 20260608212500_add_transactions_update_policy.sql
-- DESCRIPCIÓN: Añadir política RLS para permitir la actualización de
--              transacciones por parte de sus propietarios.
-- =========================================================================

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'transactions' and policyname = 'Usuarios pueden actualizar sus propias transacciones'
  ) then
    create policy "Usuarios pueden actualizar sus propias transacciones" 
      on public.transactions for update 
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;
