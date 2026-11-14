\set ON_ERROR_STOP on
-- Disposable PostgreSQL only. Uses two dblink sessions to race seller acceptance.
-- The inventory trigger intentionally pauses the winning transaction while it
-- holds the offer row lock, ensuring the second accept overlaps that reservation.
BEGIN;
\ir purchase_test_fixture.sql

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',false);
SELECT public.buyer_cancel_request(current_setting('qitaa.test.request_a')::uuid);
SELECT set_config('qitaa.test.race_request_a',
 public.create_purchase_request('95000000-0000-4000-8000-000000000001',5)::text,false);
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',false);
SELECT set_config('qitaa.test.race_request_b',
 public.create_purchase_request('95000000-0000-4000-8000-000000000001',5)::text,false);
RESET ROLE;
COMMIT;

CREATE EXTENSION IF NOT EXISTS dblink;
CREATE OR REPLACE FUNCTION public.qitaa_test_accept_as_seller(_request_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
BEGIN
 RETURN public.seller_respond_to_request(_request_id,'accept');
END $$;
GRANT EXECUTE ON FUNCTION public.qitaa_test_accept_as_seller(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.qitaa_test_delay_stock_update()
RETURNS trigger LANGUAGE plpgsql SET search_path=''
AS $$
BEGIN
 IF NEW.stock_qty < OLD.stock_qty THEN PERFORM pg_catalog.pg_sleep(1.5); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER qitaa_test_delay_stock_update
BEFORE UPDATE OF stock_qty ON public.seller_offers
FOR EACH ROW EXECUTE FUNCTION public.qitaa_test_delay_stock_update();

SELECT dblink_connect('qitaa_race_a','dbname='||current_database());
SELECT dblink_connect('qitaa_race_b','dbname='||current_database());
SELECT dblink_exec('qitaa_race_a','SET ROLE authenticated');
SELECT dblink_exec('qitaa_race_b','SET ROLE authenticated');
SELECT dblink_exec('qitaa_race_a',
 'SET request.jwt.claim.sub = ''91000000-0000-4000-8000-000000000003''');
SELECT dblink_exec('qitaa_race_b',
 'SET request.jwt.claim.sub = ''91000000-0000-4000-8000-000000000003''');

SELECT pg_temp.check_true(
 dblink_send_query('qitaa_race_a',
  format('SELECT public.qitaa_test_accept_as_seller(%L::uuid)',
   current_setting('qitaa.test.race_request_a')::uuid))=1,
 'first seller acceptance query started asynchronously');
SELECT pg_temp.check_true(
 dblink_send_query('qitaa_race_b',
  format('SELECT public.qitaa_test_accept_as_seller(%L::uuid)',
   current_setting('qitaa.test.race_request_b')::uuid))=1,
 'second seller acceptance overlaps the first');

SELECT set_config('qitaa.test.race_success_a',
 (SELECT count(*)::text FROM dblink_get_result('qitaa_race_a',false) AS x(result text)),false);
SELECT set_config('qitaa.test.race_success_b',
 (SELECT count(*)::text FROM dblink_get_result('qitaa_race_b',false) AS x(result text)),false);
SELECT pg_temp.check_true(
 current_setting('qitaa.test.race_success_a')::integer
 + current_setting('qitaa.test.race_success_b')::integer=1,
 'exactly one competing acceptance succeeds');

SELECT pg_temp.check_true(
 (SELECT stock_qty=0 FROM public.seller_offers
  WHERE id='95000000-0000-4000-8000-000000000001')
 AND (SELECT count(*)=1 FROM public.purchase_requests
  WHERE id IN (current_setting('qitaa.test.race_request_a')::uuid,
               current_setting('qitaa.test.race_request_b')::uuid) AND status='accepted')
 AND (SELECT count(*)=1 FROM public.purchase_requests
  WHERE id IN (current_setting('qitaa.test.race_request_a')::uuid,
               current_setting('qitaa.test.race_request_b')::uuid) AND status='requested'),
 'one five-unit request reserves all stock; the competing request stays requested');

-- A seller stock edit racing with a reservation must serialize on the offer row.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',false);
SELECT set_config('qitaa.test.race_request_c',
 public.create_purchase_request('95000000-0000-4000-8000-000000000002',2)::text,false);
RESET ROLE;

CREATE OR REPLACE FUNCTION public.qitaa_test_edit_available_stock(_offer_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $
BEGIN
 UPDATE public.seller_offers SET stock_qty=1 WHERE id=_offer_id;
 RETURN 'edited';
END $;
GRANT EXECUTE ON FUNCTION public.qitaa_test_edit_available_stock(uuid) TO authenticated;
SELECT dblink_exec('qitaa_race_a',
 'SET request.jwt.claim.sub = ''91000000-0000-4000-8000-000000000004''');
SELECT dblink_exec('qitaa_race_b',
 'SET request.jwt.claim.sub = ''91000000-0000-4000-8000-000000000004''');
SELECT pg_temp.check_true(
 dblink_send_query('qitaa_race_a',
  format('SELECT public.qitaa_test_accept_as_seller(%L::uuid)',
   current_setting('qitaa.test.race_request_c')::uuid))=1,
 'seller acceptance starts before the concurrent stock edit');
SELECT pg_sleep(0.25);
SELECT pg_temp.check_true(
 dblink_send_query('qitaa_race_b',
  format('SELECT public.qitaa_test_edit_available_stock(%L::uuid)',
   '95000000-0000-4000-8000-000000000002'::uuid))=1,
 'seller available-stock edit overlaps the reservation');
SELECT pg_temp.check_true(
 (SELECT count(*)=1 FROM dblink_get_result('qitaa_race_a',false) AS x(result text)),
 'reservation completes while holding the offer lock');
SELECT pg_temp.check_true(
 (SELECT count(*)=1 FROM dblink_get_result('qitaa_race_b',false) AS x(result text)),
 'concurrent seller stock edit completes after the reservation');
SELECT pg_temp.check_true(
 (SELECT stock_qty=1 FROM public.seller_offers
  WHERE id='95000000-0000-4000-8000-000000000002')
 AND (SELECT status='accepted' FROM public.purchase_requests
  WHERE id=current_setting('qitaa.test.race_request_c')::uuid),
 'reservation and seller edit serialize without rewriting the accepted order');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',false);
SELECT pg_temp.check_true(
 public.buyer_cancel_request(current_setting('qitaa.test.race_request_c')::uuid),
 'buyer can cancel after the concurrent stock edit completes');
RESET ROLE;
SELECT pg_temp.check_true(
 (SELECT stock_qty=3 FROM public.seller_offers
  WHERE id='95000000-0000-4000-8000-000000000002'),
 'cancellation restores two reserved units on top of the edited quantity');

SELECT dblink_disconnect('qitaa_race_a');
SELECT dblink_disconnect('qitaa_race_b');
DROP FUNCTION public.qitaa_test_edit_available_stock(uuid);
DROP TRIGGER qitaa_test_delay_stock_update ON public.seller_offers;
DROP FUNCTION public.qitaa_test_delay_stock_update();
DROP FUNCTION public.qitaa_test_accept_as_seller(uuid);

BEGIN;
DELETE FROM public.purchase_requests
 WHERE id IN (current_setting('qitaa.test.request_a')::uuid,
              current_setting('qitaa.test.request_b')::uuid,
              current_setting('qitaa.test.race_request_a')::uuid,
              current_setting('qitaa.test.race_request_b')::uuid,
              current_setting('qitaa.test.race_request_c')::uuid);
DELETE FROM public.seller_offers WHERE id IN
 ('95000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000002');
DELETE FROM public.sellers WHERE id IN
 ('94000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000002');
DELETE FROM public.catalog_parts WHERE id='93000000-0000-4000-8000-000000000001';
DELETE FROM public.categories WHERE id='92000000-0000-4000-8000-000000000001';
DELETE FROM public.user_roles WHERE user_id IN
 ('91000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000004');
DELETE FROM auth.users WHERE id IN
 ('91000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000004');
COMMIT;

\echo 'purchase_request_concurrency.sql PASS (acceptance races serialize; synthetic fixture cleaned)'
