\set ON_ERROR_STOP on
-- Disposable database ONLY. Independently runnable after bootstrap.sql.
-- Requirement -> B1-B6 / S1-S7. Helpers enforce real authenticated sessions.
-- Public verified active offers are intentionally readable by all; their WRITE
-- isolation is tested, not an invented requirement to hide public stock.
BEGIN;
\ir purchase_test_fixture.sql
DO $$
DECLARE suffix text; own_id uuid; other_id uuid; before_row jsonb;
BEGIN
 FOREACH suffix IN ARRAY ARRAY['1','2'] LOOP
  PERFORM set_config('request.jwt.claim.sub','91000000-0000-4000-8000-00000000000'||suffix,false);
  PERFORM pg_temp.check_session(('91000000-0000-4000-8000-00000000000'||suffix)::uuid);
  own_id := current_setting('qitaa.test.request_'||CASE suffix WHEN '1' THEN 'a' ELSE 'b' END)::uuid;
  other_id := current_setting('qitaa.test.request_'||CASE suffix WHEN '1' THEN 'b' ELSE 'a' END)::uuid;
  PERFORM pg_temp.check_true((SELECT count(*)=1 AND bool_and(id=own_id) FROM public.purchase_requests)
   AND NOT EXISTS(SELECT 1 FROM public.purchase_requests WHERE id=other_id),'B1 table reads scoped, buyer '||suffix);
  PERFORM pg_temp.check_true(jsonb_array_length(public.list_my_purchase_requests())=1
   AND (public.list_my_purchase_requests()->0->>'id')::uuid=own_id
   AND public.list_seller_purchase_requests()='[]'::jsonb,'B2 RPC reads scoped, buyer '||suffix);
  SELECT to_jsonb(r) INTO STRICT before_row FROM public.purchase_requests r WHERE id=own_id;
  PERFORM pg_temp.expect_denial(format('UPDATE public.purchase_requests SET qty=9 WHERE id=%L::uuid',other_id),'42501','permission denied for table purchase_requests');
  PERFORM pg_temp.expect_denial(format('UPDATE public.purchase_requests SET qty=9 WHERE id=%L::uuid',own_id),'42501','permission denied for table purchase_requests');
  PERFORM pg_temp.expect_denial(format('SELECT public.buyer_cancel_request(%L::uuid)',other_id),'P0001','request cannot be cancelled');
  PERFORM pg_temp.check_true((SELECT to_jsonb(r)=before_row FROM public.purchase_requests r WHERE id=own_id),'B3 own row unchanged after forbidden writes, buyer '||suffix);
 END LOOP;
END $$;

DO $$
DECLARE suffix text; owner uuid; own_id uuid; other_id uuid; action text; changed integer; before_row jsonb;
BEGIN
 FOREACH suffix IN ARRAY ARRAY['3','4'] LOOP
  owner := ('91000000-0000-4000-8000-00000000000'||suffix)::uuid;
  PERFORM set_config('request.jwt.claim.sub',owner::text,false);
  PERFORM pg_temp.check_session(owner);
  own_id := current_setting('qitaa.test.request_'||CASE suffix WHEN '3' THEN 'a' ELSE 'b' END)::uuid;
  other_id := current_setting('qitaa.test.request_'||CASE suffix WHEN '3' THEN 'b' ELSE 'a' END)::uuid;
  PERFORM pg_temp.check_true((SELECT count(*)=1 AND bool_and(id=own_id) FROM public.purchase_requests)
   AND NOT EXISTS(SELECT 1 FROM public.purchase_requests WHERE id=other_id),'S1 table reads scoped, seller '||suffix);
  PERFORM pg_temp.check_true(jsonb_array_length(public.list_seller_purchase_requests())=1
   AND (public.list_seller_purchase_requests()->0->>'id')::uuid=own_id
   AND public.list_my_purchase_requests()='[]'::jsonb,'S2 RPC reads scoped, seller '||suffix);
  SELECT to_jsonb(r) INTO STRICT before_row FROM public.purchase_requests r WHERE id=own_id;
  FOREACH action IN ARRAY ARRAY['accept','reject','fulfill'] LOOP
   PERFORM pg_temp.expect_denial(format('SELECT public.seller_respond_to_request(%L::uuid,%L)',other_id,action),'P0001','request not accessible');
  END LOOP;
  PERFORM pg_temp.expect_denial(format('UPDATE public.purchase_requests SET status=%L WHERE id=%L::uuid','accepted',other_id),'42501','permission denied for table purchase_requests');
  PERFORM pg_temp.expect_denial(format('UPDATE public.purchase_requests SET status=%L WHERE id=%L::uuid','accepted',own_id),'42501','permission denied for table purchase_requests');
  PERFORM pg_temp.expect_denial(format('SELECT public.buyer_cancel_request(%L::uuid)',other_id),'P0001','request cannot be cancelled');
  UPDATE public.seller_offers SET stock_qty=0 WHERE id=CASE suffix WHEN '3' THEN '95000000-0000-4000-8000-000000000002'::uuid ELSE '95000000-0000-4000-8000-000000000001'::uuid END;
  GET DIAGNOSTICS changed=ROW_COUNT;
  PERFORM pg_temp.check_true(changed=0 AND (SELECT to_jsonb(r)=before_row FROM public.purchase_requests r WHERE id=own_id),'S3 foreign request actions denied and foreign stock update affects zero rows, seller '||suffix);
 END LOOP;
END $$;

SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000004',false);
SELECT pg_temp.check_session('91000000-0000-4000-8000-000000000004');
DO $$
DECLARE changed integer;
BEGIN
 UPDATE public.seller_offers SET stock_qty=8 WHERE id='95000000-0000-4000-8000-000000000002';
 GET DIAGNOSTICS changed=ROW_COUNT;
 PERFORM pg_temp.check_true(changed=1 AND (SELECT stock_qty=8 FROM public.seller_offers WHERE id='95000000-0000-4000-8000-000000000002'),'S4 verified owner can edit its own stock');
 UPDATE public.seller_offers SET stock_qty=7 WHERE id='95000000-0000-4000-8000-000000000002';
END $$;
SELECT pg_temp.expect_denial('UPDATE public.seller_offers SET stock_qty=-1 WHERE id=''95000000-0000-4000-8000-000000000002''','23514','new row for relation "seller_offers" violates check constraint "seller_offers_stock_nonneg"');
SELECT pg_temp.check_true((SELECT stock_qty=7 FROM public.seller_offers WHERE id='95000000-0000-4000-8000-000000000002'),'negative stock denied for legitimate owner, stock remains 7');
SELECT pg_temp.check_true((SELECT status='requested' AND qty=1 AND accepted_at IS NULL AND closed_at IS NULL FROM public.purchase_requests WHERE id=current_setting('qitaa.test.request_b')::uuid),'B4/S5 buyer B request survived every cross-account denial');
SELECT pg_temp.check_true(public.seller_respond_to_request(current_setting('qitaa.test.request_b')::uuid,'reject')='reject','S6 seller B can reject its own request');
SELECT pg_temp.check_true((SELECT status='rejected' FROM public.purchase_requests WHERE id=current_setting('qitaa.test.request_b')::uuid)
 AND (SELECT stock_qty=7 FROM public.seller_offers WHERE id='95000000-0000-4000-8000-000000000002'),'S7 own rejection leaves stock 7');

SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',false);
SELECT pg_temp.check_session('91000000-0000-4000-8000-000000000003');
SELECT pg_temp.check_true((SELECT status='requested' AND qty=2 AND accepted_at IS NULL AND closed_at IS NULL FROM public.purchase_requests WHERE id=current_setting('qitaa.test.request_a')::uuid)
 AND (SELECT stock_qty=5 FROM public.seller_offers WHERE id='95000000-0000-4000-8000-000000000001'),'B5 buyer A request and stock survived every cross-account denial');
SELECT public.seller_respond_to_request(current_setting('qitaa.test.request_a')::uuid,'accept');
SELECT pg_temp.check_true((SELECT status='accepted' AND qty=2 FROM public.purchase_requests WHERE id=current_setting('qitaa.test.request_a')::uuid)
 AND (SELECT stock_qty=3 FROM public.seller_offers WHERE id='95000000-0000-4000-8000-000000000001'),'owner acceptance reserves exactly 2 of 5 units');
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',false);
SELECT pg_temp.check_session('91000000-0000-4000-8000-000000000001');
SELECT pg_temp.check_true(public.buyer_cancel_request(current_setting('qitaa.test.request_a')::uuid),'B6 buyer can cancel its own accepted request');
SELECT pg_temp.check_true((SELECT status='cancelled' AND qty=2 FROM public.purchase_requests WHERE id=current_setting('qitaa.test.request_a')::uuid)
 AND (SELECT stock_qty=5 FROM public.seller_offers WHERE id='95000000-0000-4000-8000-000000000001')
 AND (SELECT stock_qty=7 FROM public.seller_offers WHERE id='95000000-0000-4000-8000-000000000002'),'stock restored to 5 and 7, quantities never negative or cross-mutated');
ROLLBACK;
\echo 'purchase_request_isolation.sql PASS (21 assertions; fixture rolled back)'
