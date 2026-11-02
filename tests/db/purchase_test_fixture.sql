\set ON_ERROR_STOP on
-- Shared synthetic fixture, included only inside a caller's BEGIN/ROLLBACK.
-- Spec/plan/tasks: rejection must close without reservation; two buyers and two
-- verified sellers must have scoped table/RPC reads and writes. Assert expected
-- SQLSTATE + message, positive owner paths, and unchanged records after denial.
-- Production migrations/policies/grants are reused unchanged; no RLS bypass in
-- assertions or calls. Privileged statements below ONLY seed disposable data.
-- Acceptance mapping: rejection R1-R6; buyer isolation B1-B6; seller S1-S7.
INSERT INTO auth.users(id,raw_user_meta_data) VALUES
 ('91000000-0000-4000-8000-000000000001','{"full_name":"synthetic buyer A"}'),
 ('91000000-0000-4000-8000-000000000002','{"full_name":"synthetic buyer B"}'),
 ('91000000-0000-4000-8000-000000000003','{"full_name":"synthetic seller A"}'),
 ('91000000-0000-4000-8000-000000000004','{"full_name":"synthetic seller B"}');
INSERT INTO public.user_roles(user_id,role) VALUES
 ('91000000-0000-4000-8000-000000000003','seller'),
 ('91000000-0000-4000-8000-000000000004','seller');
INSERT INTO public.categories(id,slug,name_ar,name_en) VALUES
 ('92000000-0000-4000-8000-000000000001','synthetic-isolation','اختبار اصطناعي','Synthetic test');
INSERT INTO public.catalog_parts(id,category_id,oem_number,name_ar,name_en) VALUES
 ('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','SYNTHETIC-ISOLATION','قطعة اختبار اصطناعية','Synthetic test part');
INSERT INTO public.sellers(id,owner_id,name,city,is_verified) VALUES
 ('94000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003','Synthetic seller A','Test city',true),
 ('94000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000004','Synthetic seller B','Test city',true);
INSERT INTO public.seller_offers(id,seller_id,part_id,price_yer,stock_qty) VALUES
 ('95000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001',1000,5),
 ('95000000-0000-4000-8000-000000000002','94000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000001',2000,7);

-- SECURITY INVOKER helpers: dynamic SQL executes as the tested authenticated role.
CREATE FUNCTION pg_temp.check_true(ok boolean, label text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF;
 RAISE NOTICE 'PASS: %',label;
END $$;
CREATE FUNCTION pg_temp.expect_denial(statement text, expected_state text, expected_message text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE denied boolean := false;
BEGIN
 BEGIN
  EXECUTE statement;
 EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE <> expected_state OR SQLERRM <> expected_message THEN
   RAISE EXCEPTION 'Unexpected denial: [%] %, expected [%] %',SQLSTATE,SQLERRM,expected_state,expected_message;
  END IF;
  denied := true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: unauthorized/invalid statement succeeded: %',statement; END IF;
END $$;
CREATE FUNCTION pg_temp.check_session(expected_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
 IF current_user <> 'authenticated' OR auth.uid() IS DISTINCT FROM expected_user
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolbypassrls)) THEN
  RAISE EXCEPTION 'FAIL: incorrect role/session or RLS bypass';
 END IF;
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',false);
SELECT pg_temp.check_session('91000000-0000-4000-8000-000000000001');
SELECT set_config('qitaa.test.request_a',public.create_purchase_request('95000000-0000-4000-8000-000000000001',2)::text,false);
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',false);
SELECT pg_temp.check_session('91000000-0000-4000-8000-000000000002');
SELECT set_config('qitaa.test.request_b',public.create_purchase_request('95000000-0000-4000-8000-000000000002',1)::text,false);
-- Caller continues under authenticated. No privileged assertions follow.
