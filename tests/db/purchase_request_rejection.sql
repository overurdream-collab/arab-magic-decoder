\set ON_ERROR_STOP on
-- Disposable database ONLY. Independently runnable after bootstrap.sql.
-- Requirement -> tests R1-R6 below; fixture has specification/plan/task mapping.
-- No payments, delivery, browser journey or production behavior is claimed.
BEGIN;
\ir purchase_test_fixture.sql
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',false);
SELECT pg_temp.check_session('91000000-0000-4000-8000-000000000001');
SELECT pg_temp.expect_denial(format('SELECT public.seller_respond_to_request(%L::uuid,%L)',current_setting('qitaa.test.request_a'),'reject'),'P0001','request not accessible');
SELECT pg_temp.check_true(
 (SELECT status='requested' AND accepted_at IS NULL AND closed_at IS NULL AND qty=2 FROM public.purchase_requests WHERE id=current_setting('qitaa.test.request_a')::uuid)
 AND (SELECT stock_qty=5 FROM public.seller_offers WHERE id='95000000-0000-4000-8000-000000000001'),
 'R1 buyer cannot reject; request and stock unchanged');

SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',false);
SELECT pg_temp.check_session('91000000-0000-4000-8000-000000000003');
SELECT pg_temp.check_true((SELECT count(*)=1 FROM public.purchase_requests) AND jsonb_array_length(public.list_seller_purchase_requests())=1,'R2 owner seller sees only its request');
SELECT pg_temp.check_true(public.seller_respond_to_request(current_setting('qitaa.test.request_a')::uuid,'reject','synthetic rejection')='reject'
 AND (SELECT stock_qty=5 FROM public.seller_offers WHERE id='95000000-0000-4000-8000-000000000001'),'R3 rejection returns reject without reserving stock');
-- Separate statement: observe effects after the modifying RPC has completed.
SELECT pg_temp.check_true((SELECT status='rejected' AND review_note='synthetic rejection' AND accepted_at IS NULL AND closed_at IS NOT NULL AND qty=2 AND price_yer=1000 FROM public.purchase_requests WHERE id=current_setting('qitaa.test.request_a')::uuid),'R4 rejection status, note, closure and quantity correct');
DO $$
DECLARE action text; before_row jsonb;
BEGIN
 SELECT to_jsonb(r) INTO STRICT before_row FROM public.purchase_requests r WHERE id=current_setting('qitaa.test.request_a')::uuid;
 FOREACH action IN ARRAY ARRAY['accept','reject','fulfill'] LOOP
  PERFORM pg_temp.expect_denial(format('SELECT public.seller_respond_to_request(%L::uuid,%L)',current_setting('qitaa.test.request_a'),action),'P0001','invalid request state transition');
  PERFORM pg_temp.check_true((SELECT to_jsonb(r)=before_row FROM public.purchase_requests r WHERE id=current_setting('qitaa.test.request_a')::uuid)
   AND (SELECT stock_qty=5 FROM public.seller_offers WHERE id='95000000-0000-4000-8000-000000000001'),'R5 rejected request cannot be processed: '||action);
 END LOOP;
END $$;
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',false);
SELECT pg_temp.check_session('91000000-0000-4000-8000-000000000001');
SELECT pg_temp.expect_denial(format('SELECT public.buyer_cancel_request(%L::uuid)',current_setting('qitaa.test.request_a')),'P0001','request cannot be cancelled');
SELECT pg_temp.check_true((SELECT status='rejected' FROM public.purchase_requests WHERE id=current_setting('qitaa.test.request_a')::uuid)
 AND public.list_my_purchase_requests()->0->>'status'='rejected'
 AND (SELECT stock_qty=5 FROM public.seller_offers WHERE id='95000000-0000-4000-8000-000000000001'),'R6 buyer sees rejected request but cannot cancel; stock stays 5');
ROLLBACK;
\echo 'purchase_request_rejection.sql PASS (8 assertions; fixture rolled back)'
