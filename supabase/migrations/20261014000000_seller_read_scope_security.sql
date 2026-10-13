-- Qitaa phase 1 — additive security hardening, no user data changes.
-- Approval remains server-side. Public consumers see only offers from verified merchants.

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role = 'admin'::public.app_role
  );
$$;
REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- Calling has_role(UUID, role) as authenticated is intentionally not required:
-- it would expose other users' roles to a client knowing their UUID.
DROP POLICY IF EXISTS "applicant reads own" ON public.seller_applications;
CREATE POLICY "applicant reads own" ON public.seller_applications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_current_user_admin()));

DROP POLICY IF EXISTS "public read offers" ON public.seller_offers;
CREATE POLICY "public read offers" ON public.seller_offers
  FOR SELECT TO PUBLIC
  USING (
    is_active
    AND EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = seller_offers.seller_id AND s.is_verified
    )
  );

-- The backend approval RPC (SECURITY DEFINER) is the sole path to create sellers.
REVOKE INSERT ON public.sellers FROM authenticated;
-- Sellers may disable their offers using UPDATE, but not physically delete history.
REVOKE DELETE ON public.seller_offers FROM authenticated;

CREATE INDEX IF NOT EXISTS idx_offers_verified_lookup
  ON public.seller_offers(part_id, seller_id)
  WHERE is_active;
