\set ON_ERROR_STOP on
-- Synthetic users, synthetic catalog and merchant data. Uses disposable local postgres.
INSERT INTO auth.users (id) VALUES
 ('11111111-1111-4111-8111-111111111111'), -- buyer / applicant
 ('22222222-2222-4222-8222-222222222222'), -- other buyer
 ('33333333-3333-4333-8333-333333333333'); -- platform admin
INSERT INTO public.user_roles(user_id,role)
 VALUES ('33333333-3333-4333-8333-333333333333','admin');
INSERT INTO public.categories (id,slug,name_ar,name_en)
 VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','oil-filter','فلتر','Filter');
INSERT INTO public.catalog_parts(id,category_id,oem_number,name_ar,name_en)
 VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','TEST-1','فلتر تجريبي','Sample filter');
INSERT INTO public.sellers(id,owner_id,name,city,is_verified)
 VALUES('cccccccc-cccc-4ccc-8ccc-cccccccccccc','22222222-2222-4222-8222-222222222222','Unverified workshop','Sana',false);
INSERT INTO public.seller_offers (seller_id,part_id,price_yer,is_active)
 VALUES('cccccccc-cccc-4ccc-8ccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',500,true);

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
INSERT INTO public.seller_applications(user_id,business_name,seller_type,city,phone)
 VALUES('11111111-1111-4111-8111-111111111111','Applicant Store','new_parts','Sana','777000111');
DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.approve_seller_application(
      (SELECT id FROM public.seller_applications WHERE user_id = auth.uid())
    );
  EXCEPTION WHEN OTHERS THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'SECURITY FAILURE: applicant self-approved'; END IF;
END $$;
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.seller_applications;
  IF n<>1 THEN RAISE EXCEPTION 'Applicant cannot read own application'; END IF;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.seller_applications;
  IF n<>0 THEN RAISE EXCEPTION 'SECURITY FAILURE: other user sees application'; END IF;
END $$;
DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.user_roles(user_id,role)
      VALUES ('22222222-2222-4222-8222-222222222222','admin');
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'SECURITY FAILURE: self-assigned admin'; END IF;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.seller_applications;
  IF n<>1 THEN RAISE EXCEPTION 'Admin cannot see seller applications'; END IF;
  PERFORM public.approve_seller_application(
    (SELECT id FROM public.seller_applications WHERE status='pending')
  );
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.sellers WHERE owner_id = auth.uid() AND is_verified;
  IF n<>1 THEN RAISE EXCEPTION 'Approved seller not created'; END IF;
END $$;
INSERT INTO public.seller_offers(seller_id,part_id,price_yer,stock_qty,is_active)
 SELECT id,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1000,3,true
 FROM public.sellers WHERE owner_id=auth.uid() AND is_verified;
DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    UPDATE public.sellers SET is_verified=false WHERE owner_id=auth.uid();
  EXCEPTION WHEN OTHERS THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'SECURITY FAILURE: seller disabled own verification'; END IF;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
DECLARE n integer;
BEGIN
  UPDATE public.seller_offers SET price_yer=1
  WHERE seller_id IN (SELECT id FROM public.sellers
                      WHERE owner_id='11111111-1111-4111-8111-111111111111');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'SECURITY FAILURE: seller offer tampering'; END IF;
END $$;
DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.seller_offers(seller_id,part_id,price_yer)
    SELECT id,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1
    FROM public.sellers WHERE owner_id='11111111-1111-4111-8111-111111111111';
  EXCEPTION WHEN OTHERS THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'SECURITY FAILURE: spoofed seller ID'; END IF;
END $$;
RESET ROLE;

SET ROLE anon;
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.seller_offers;
  IF n<>1 THEN RAISE EXCEPTION 'SECURITY FAILURE: anon sees unverified seller offer, count=%',n; END IF;
END $$;
RESET ROLE;

INSERT INTO public.customer_vehicles(id,user_id,current_mileage)
 VALUES('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222',1000);
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.vehicle_maintenance_logs(vehicle_id,user_id,current_mileage,next_due_mileage)
      VALUES('dddddddd-dddd-4ddd-8ddd-dddddddddddd',auth.uid(),1000,6000);
  EXCEPTION WHEN OTHERS THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'SECURITY FAILURE: cross-user maintenance log'; END IF;
END $$;
RESET ROLE;
SELECT 'Qitaa seller/admin/garage RLS disposable integration checks: PASS' result;
