-- SECURITY: block direct client INSERTs into public.orders.
-- Orders are now created exclusively via the server function
-- `createOrder` (src/lib/orders.functions.ts), which uses the admin
-- client (bypasses RLS) after recomputing every item's price from
-- the products catalog. Removing these permissive INSERT policies
-- ensures a browser cannot bypass the price recomputation.
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_safe_fields" ON public.orders;

-- Belt-and-suspenders: an explicit RESTRICTIVE policy that denies
-- every direct client insert. Even if a permissive INSERT policy is
-- accidentally added later, it cannot override this.
DROP POLICY IF EXISTS "Block direct client order inserts" ON public.orders;
CREATE POLICY "Block direct client order inserts"
  ON public.orders
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);
