\set ON_ERROR_STOP on
-- Synthetic fulfillment lifecycle; disposable database only.
BEGIN;
\ir purchase_test_fixture.sql
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',false);
SELECT pg_temp.check_session('91000000-0000-4000-8000-000000000003');
SELECT pg_temp.expect_denial(
 format('SELECT public.seller_respond_to_request(%L::uuid,%L)',current_setting('qitaa.test.request_a'),'fulfill'),
 'P0001','invalid request state transition');
SELECT pg_temp.check_true(
 (SELECT status='requested' FROM public.purchase_requests WHERE id=current_setting('qitaa.test.request_a')::uuid)
 AND (SELECT stock_qty=5 FROM public.seller_offers WHERE id='95000000-0000-4000-8000-000000000001'),
 'seller cannot fulfill before accepting');
SELECT pg_temp.check_true(
 public.seller_respond_to_request(current_setting('qitaa.test.request_a')::uuid,'accept')='accept',
 'seller accepts and reserves stock');
SELECT pg_temp.check_true(
 (SELECT stock_qty=3 FROM public.seller_offers WHERE id='95000000-0000-4000-8000-000000000001'),
 'acceptance reserves two units');
SELECT pg_temp.check_true(
 public.seller_respond_to_request(current_setting('qitaa.test.request_a')::uuid,'fulfill')='fulfill',
 'seller can fulfill accepted request');
SELECT pg_temp.check_true(
 (SELECT status='fulfilled' AND closed_at IS NOT NULL FROM public.purchase_requests
  WHERE id=current_setting('qitaa.test.request_a')::uuid)
 AND (SELECT stock_qty=3 FROM public.seller_offers WHERE id='95000000-0000-4000-8000-000000000001'),
 'fulfillment closes request without restoring reserved stock');
DO $terminal$
DECLARE action text;
BEGIN
 FOREACH action IN ARRAY ARRAY['accept','reject','fulfill'] LOOP
  PERFORM pg_temp.expect_denial(
   format('SELECT public.seller_respond_to_request(%L::uuid,%L)',
    current_setting('qitaa.test.request_a'),action),
   'P0001','invalid request state transition');
 END LOOP;
END $terminal$;
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',false);
SELECT pg_temp.check_session('91000000-0000-4000-8000-000000000001');
SELECT pg_temp.expect_denial(
 format('SELECT public.buyer_cancel_request(%L::uuid)',current_setting('qitaa.test.request_a')),
 'P0001','request cannot be cancelled');
SELECT pg_temp.check_true(
 (SELECT status='fulfilled' FROM public.purchase_requests WHERE id=current_setting('qitaa.test.request_a')::uuid)
 AND (SELECT stock_qty=3 FROM public.seller_offers WHERE id='95000000-0000-4000-8000-000000000001'),
 'fulfilled request cannot be cancelled or have stock restored');
ROLLBACK;
\echo 'purchase_request_fulfillment.sql PASS (fixture rolled back)'
