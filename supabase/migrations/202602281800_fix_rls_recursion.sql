-- Drop the previous recursive admin policy
DROP POLICY IF EXISTS "Admins can view all profiles." ON public.users;

-- Create a new, non-recursive policy
-- We use a simpler check: only if the current row belongs to the user
-- For a true admin, they shouldn't trigger an infinite loop. We can avoid recursion by checking the jwt metadata OR
-- creating a separate security definer function.
-- Let's just create a non-recursive policy based on the JWT metadata (since we use auth metadata)
CREATE POLICY "Admins can view all profiles."
  ON public.users FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
