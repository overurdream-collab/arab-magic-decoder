-- 1) Seller applications (private until admin approval)
CREATE TABLE public.seller_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_name text NOT NULL CHECK (char_length(business_name) BETWEEN 2 AND 120),
  seller_type text NOT NULL DEFAULT 'new_parts' CHECK (seller_type IN ('new_parts','used_parts','tires','batteries','oils','accessories')),
  city text NOT NULL CHECK (char_length(city) BETWEEN 2 AND 60),
  district text,
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 6 AND 20),
  commercial_register text,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  seller_id uuid REFERENCES public.sellers(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX seller_applications_one_pending ON public.seller_applications(user_id) WHERE status = 'pending';
CREATE INDEX seller_applications_status_idx ON public.seller_applications(status, created_at DESC);

GRANT SELECT, INSERT ON public.seller_applications TO authenticated;
GRANT ALL ON public.seller_applications TO service_role;
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applicant reads own" ON public.seller_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "applicant submits pending" ON public.seller_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND seller_id IS NULL AND review_note IS NULL);

CREATE TRIGGER trg_seller_apps_updated BEFORE UPDATE ON public.seller_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Admin-only review functions (server-side role check)
CREATE OR REPLACE FUNCTION public.approve_seller_application(_app_id uuid, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.seller_applications; new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO a FROM public.seller_applications WHERE id = _app_id FOR UPDATE;
  IF NOT FOUND OR a.status <> 'pending' THEN RAISE EXCEPTION 'application not pending'; END IF;
  INSERT INTO public.sellers (owner_id, name, seller_type, city, district, phone, is_verified, rating, reviews_count)
  VALUES (a.user_id, a.business_name, a.seller_type, a.city, a.district, a.phone, true, 0, 0)
  RETURNING id INTO new_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (a.user_id, 'seller') ON CONFLICT (user_id, role) DO NOTHING;
  UPDATE public.seller_applications SET status='approved', seller_id=new_id, reviewed_by=auth.uid(), reviewed_at=now(), review_note=_note WHERE id=_app_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.reject_seller_application(_app_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.seller_applications SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), review_note=_note
  WHERE id=_app_id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'application not pending'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.approve_seller_application(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_seller_application(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_seller_application(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_seller_application(uuid, text) TO authenticated;

-- 3) Sellers: owners may edit contact info only, never verification/rating/ownership
CREATE OR REPLACE FUNCTION public.protect_seller_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
       OR NEW.rating IS DISTINCT FROM OLD.rating OR NEW.reviews_count IS DISTINCT FROM OLD.reviews_count
       OR NEW.seller_type IS DISTINCT FROM OLD.seller_type THEN
      RAISE EXCEPTION 'protected seller fields';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_protect_seller_fields BEFORE UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION public.protect_seller_fields();

-- 4) Seller offers: only owner of a VERIFIED seller can write; value constraints
DROP POLICY IF EXISTS "seller manages own offers" ON public.seller_offers;
CREATE POLICY "verified seller reads own offers" ON public.seller_offers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_offers.seller_id AND s.owner_id = auth.uid()));
CREATE POLICY "verified seller inserts own offers" ON public.seller_offers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_offers.seller_id AND s.owner_id = auth.uid() AND s.is_verified));
CREATE POLICY "verified seller updates own offers" ON public.seller_offers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_offers.seller_id AND s.owner_id = auth.uid() AND s.is_verified))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_offers.seller_id AND s.owner_id = auth.uid() AND s.is_verified));
GRANT SELECT, INSERT, UPDATE ON public.seller_offers TO authenticated;

ALTER TABLE public.seller_offers
  ADD CONSTRAINT seller_offers_price_pos CHECK (price_yer > 0) NOT VALID,
  ADD CONSTRAINT seller_offers_stock_nonneg CHECK (stock_qty >= 0) NOT VALID,
  ADD CONSTRAINT seller_offers_warranty_range CHECK (warranty_months BETWEEN 0 AND 120) NOT VALID,
  ADD CONSTRAINT seller_offers_delivery_range CHECK (delivery_days BETWEEN 0 AND 60) NOT VALID,
  ADD CONSTRAINT seller_offers_condition_chk CHECK (condition IN ('new','used')) NOT VALID,
  ADD CONSTRAINT seller_offers_quality_chk CHECK (quality_grade IN ('oem','first_grade','aftermarket','used')) NOT VALID;
CREATE INDEX IF NOT EXISTS seller_offers_seller_idx ON public.seller_offers(seller_id);
CREATE INDEX IF NOT EXISTS seller_offers_part_idx ON public.seller_offers(part_id);
CREATE INDEX IF NOT EXISTS sellers_owner_idx ON public.sellers(owner_id);

-- 5) Maintenance logs: vehicle must belong to the same user (prevents attaching logs to others' cars)
DROP POLICY IF EXISTS "own logs" ON public.vehicle_maintenance_logs;
CREATE POLICY "own logs" ON public.vehicle_maintenance_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.customer_vehicles v WHERE v.id = vehicle_id AND v.user_id = auth.uid()));
