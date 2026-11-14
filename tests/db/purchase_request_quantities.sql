\set ON_ERROR_STOP on
-- Disposable PostgreSQL only: request quantity validation, stock reservation, and rollback.
BEGIN;
\ir purchase_test_fixture.sql
-- Buyer B has an open request for seller B, but none for seller A.
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',false);
SELECT pg_temp.check_session('91000000-0000-4000-8000-000000000002');
DO $quantity_guards$
DECLARE amount integer;
BEGIN
 FOREACH amount IN ARRAY ARRAY[-1,0,21] LOOP
  PERFORM pg_temp.expect_denial(
   format('SELECT public.create_purchase_request(%L::uuid,%s)',
    '95000000-0000-4000-8000-000000000001',amount),
   'P0001','invalid quantity');
 END LOOP;
 PERFORM pg_temp.expect_denial(
  'SELECT public.create_purchase_request(''95000000-0000-4000-8000-000000000001'',6)',
  'P0001','offer unavailable');
 PERFORM pg_temp.check_true(
  (SELECT count(*)=0 FROM public.purchase_requests
   WHERE buyer_id=auth.uid() AND offer_id='95000000-0000-4000-8000-000000000001')
  AND (SELECT stock_qty=5 FROM public.seller_offers
   WHERE id='95000000-0000-4000-8000-000000000001'),
  'invalid and insufficient quantities create no request and change no stock');
END $quantity_guards$;
SELECT set_config('qitaa.test.quantity_request',
 public.create_purchase_request('95000000-0000-4000-8000-000000000001',5)::text,false);
SELECT pg_temp.check_true(
 (SELECT qty=5 AND status='requested' FROM public.purchase_requests
  WHERE id=current_setting('qitaa.test.quantity_request')::uuid)
 AND (SELECT stock_qty=5 FROM public.seller_offers
  WHERE id='95000000-0000-4000-8000-000000000001'),
 'requesting all five units does not reserve stock before seller approval');
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',false);
SELECT pg_temp.check_session('91000000-0000-4000-8000-000000000003');
-- A request is not a reservation: the seller can change available stock before acceptance.
UPDATE public.seller_offers SET stock_qty=4
 WHERE id='95000000-0000-4000-8000-000000000001';
SELECT pg_temp.expect_denial(
 format('SELECT public.seller_respond_to_request(%L::uuid,''accept'')',
  current_setting('qitaa.test.quantity_request')::uuid),
 'P0001','stock changed');
SELECT pg_temp.check_true(
 (SELECT stock_qty=4 FROM public.seller_offers
  WHERE id='95000000-0000-4000-8000-000000000001')
 AND (SELECT status='requested' AND qty=5 FROM public.purchase_requests
  WHERE id=current_setting('qitaa.test.quantity_request')::uuid),
 'accepting after stock falls below requested quantity changes neither stock nor request state');
UPDATE public.seller_offers SET stock_qty=5
 WHERE id='95000000-0000-4000-8000-000000000001';
SELECT pg_temp.check_true(
 public.seller_respond_to_request(current_setting('qitaa.test.quantity_request')::uuid,'accept')='accept',
 'seller can accept exactly the available stock');
SELECT pg_temp.check_true(
 (SELECT stock_qty=0 FROM public.seller_offers
  WHERE id='95000000-0000-4000-8000-000000000001')
 AND (SELECT status='accepted' AND qty=5 FROM public.purchase_requests
  WHERE id=current_setting('qitaa.test.quantity_request')::uuid),
 'accepted quantity reserves all five units without negative inventory');
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',false);
SELECT pg_temp.check_true(
 public.buyer_cancel_request(current_setting('qitaa.test.quantity_request')::uuid),
 'buyer can cancel an accepted full-stock request');
SELECT pg_temp.check_true(
 (SELECT stock_qty=5 FROM public.seller_offers
  WHERE id='95000000-0000-4000-8000-000000000001')
 AND (SELECT status='cancelled' FROM public.purchase_requests
  WHERE id=current_setting('qitaa.test.quantity_request')::uuid),
 'cancellation restores exactly five units');

SELECT set_config('qitaa.test.edited_stock_request',
 public.create_purchase_request('95000000-0000-4000-8000-000000000001',2)::text,false);
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',false);
SELECT pg_temp.check_true(
 public.seller_respond_to_request(current_setting('qitaa.test.edited_stock_request')::uuid,'accept')='accept'
 AND (SELECT stock_qty=3 FROM public.seller_offers
  WHERE id='95000000-0000-4000-8000-000000000001'),
 'accepting two units leaves three available while the order quantity is reserved');
UPDATE public.seller_offers SET stock_qty=1
 WHERE id='95000000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',false);
SELECT pg_temp.check_true(
 public.buyer_cancel_request(current_setting('qitaa.test.edited_stock_request')::uuid),
 'buyer can cancel after seller adjusts available stock');
SELECT pg_temp.check_true(
 (SELECT stock_qty=3 FROM public.seller_offers
  WHERE id='95000000-0000-4000-8000-000000000001')
 AND (SELECT status='cancelled' FROM public.purchase_requests
  WHERE id=current_setting('qitaa.test.edited_stock_request')::uuid),
 'cancellation adds the two released units to the seller-adjusted available quantity');

ROLLBACK;
\echo 'purchase_request_quantities.sql PASS (fixture rolled back)'
