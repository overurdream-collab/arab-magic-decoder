-- Seller onboarding schema and server-side review lifecycle.
-- This migration intentionally precedes 20261014000000_seller_read_scope_security.sql.

CREATE TABLE IF NOT EXISTS public.seller_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL CHECK (length(btrim(business_name)) BETWEEN 2 AND 120),
  seller_type text NOT NULL CHECK (seller_type IN ('new_parts','used_parts','tires','batteries','oils','accessories')),
  city text NOT NULL CHECK (length(btrim(city)) BETWEEN 2 AND 100),
  district text,
  phone text NOT NULL CHECK (length(btrim(phone)) BETWEEN 6 AND 20),
  commercial_register text,
  notes text CHECK (notes IS NULL OR length(notes) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_note text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'pending' AND reviewed_at IS NULL AND reviewed_by IS NULL)
      OR (status <> 'pending' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS seller_applications_user_created
  ON public.seller_applications(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS seller_applications_one_pending_per_user
  ON public.seller_applications(user_id) WHERE status = 'pending';

ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seller_applications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.seller_applications TO authenticated;
GRANT ALL ON public.seller_applications TO service_role;

CREATE POLICY "applicant reads own" ON public.seller_applications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_current_user_admin()));
CREATE POLICY "applicant submits own pending application" ON public.seller_applications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'pending'
    AND reviewed_at IS NULL AND reviewed_by IS NULL);

CREATE TRIGGER trg_seller_applications_updated
  BEFORE UPDATE ON public.seller_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.approve_seller_application(_app_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE app public.seller_applications; new_seller_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO app FROM public.seller_applications WHERE id = _app_id FOR UPDATE;
  IF NOT FOUND OR app.status <> 'pending' THEN
    RAISE EXCEPTION 'application not pending';
  END IF;
  INSERT INTO public.sellers(owner_id,name,seller_type,city,district,phone,is_verified)
  VALUES(app.user_id,app.business_name,app.seller_type,app.city,app.district,app.phone,true)
  RETURNING id INTO new_seller_id;
  INSERT INTO public.user_roles(user_id,role)
  VALUES(app.user_id,'seller'::public.app_role)
  ON CONFLICT (user_id,role) DO NOTHING;
  UPDATE public.seller_applications
    SET status='approved',reviewed_by=auth.uid(),reviewed_at=now(),review_note=NULL
    WHERE id=_app_id;
  RETURN new_seller_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_seller_application(_app_id uuid,_note text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.seller_applications
    SET status='rejected',review_note=left(coalesce(_note,''),500),
        reviewed_by=auth.uid(),reviewed_at=now()
    WHERE id=_app_id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'application not pending'; END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_seller_application(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.reject_seller_application(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_seller_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_seller_application(uuid,text) TO authenticated;
