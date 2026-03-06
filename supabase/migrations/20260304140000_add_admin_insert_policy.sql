-- Allow admins to create contracts
create policy "Admins can insert contracts"
  on public.contracts for insert
  with check ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );
