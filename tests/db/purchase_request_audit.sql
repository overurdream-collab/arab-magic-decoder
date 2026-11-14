\set ON_ERROR_STOP on
-- Disposable PostgreSQL only: participants can read request history, but clients cannot alter it.
BEGIN;
-- Explicit SQL privilege regression: newly added SECURITY DEFINER readers
-- must never become callable by anonymous sessions or PUBLIC.
DO $audit_reader_acl$
BEGIN
 IF has_function_privilege('anon','public.list_purchase_request_events(uuid)','EXECUTE')
 OR has_function_privilege('public','public.list_purchase_request_events(uuid)','EXECUTE')
 OR has_function_privilege('anon','public.list_admin_purchase_requests(text)','EXECUTE')
 OR has_function_privilege('public','public.list_admin_purchase_requests(text)','EXECUTE') THEN
  RAISE EXCEPTION 'SECURITY FAILURE: anonymous/PUBLIC execution of request audit or admin readers';
 END IF;
 IF NOT has_function_privilege('authenticated','public.list_purchase_request_events(uuid)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.list_admin_purchase_requests(text)','EXECUTE') THEN
  RAISE EXCEPTION 'SECURITY FAILURE: authenticated reader privilege unexpectedly absent';
 END IF;
 IF has_table_privilege('anon','public.purchase_request_events','SELECT')
 OR has_table_privilege('anon','public.purchase_request_events','INSERT')
 OR has_table_privilege('anon','public.purchase_request_events','UPDATE')
 OR has_table_privilege('anon','public.purchase_request_events','DELETE') THEN
  RAISE EXCEPTION 'SECURITY FAILURE: anonymous access to append-only audit table';
 END IF;
END $audit_reader_acl$;

\ir purchase_test_fixture.sql

RESET ROLE;
INSERT INTO auth.users(id,raw_user_meta_data) VALUES
 ('91000000-0000-4000-8000-000000000005','{"full_name":"synthetic admin"}');
INSERT INTO public.user_roles(user_id,role) VALUES
 ('91000000-0000-4000-8000-000000000005','admin');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000005',false);
SELECT pg_temp.check_session('91000000-0000-4000-8000-000000000005');
SELECT pg_temp.check_true(
 EXISTS (
  SELECT 1 FROM jsonb_array_elements(public.list_admin_purchase_requests()) AS item
  WHERE item->>'id'=current_setting('qitaa.test.request_a')
 ),
 'administrator can list the seeded request intent');
SELECT pg_temp.check_true(
 EXISTS (
  SELECT 1 FROM jsonb_array_elements(public.list_admin_purchase_requests('requested')) AS item
  WHERE item->>'id'=current_setting('qitaa.test.request_a')
 ),
 'administrator can filter request intents by status');
SELECT pg_temp.check_true(
 jsonb_array_length(public.list_admin_purchase_requests('fulfilled'))=0,
 'administrator fulfilled filter does not leak requested rows');
SELECT pg_temp.check_true(
 (SELECT count(*)=1
  FROM jsonb_array_elements(public.list_admin_purchase_requests()) AS item
  WHERE item->>'id'=current_setting('qitaa.test.request_a')),
 'administrator monitor does not duplicate the seeded request');
SELECT pg_temp.check_true(
 jsonb_array_length(public.list_purchase_request_events(current_setting('qitaa.test.request_a')::uuid))=1,
 'administrator can view request audit history');
SELECT pg_temp.expect_denial(
 'SELECT public.list_admin_purchase_requests(''not-a-status'')',
 'P0001','invalid status');

SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',false);
SELECT pg_temp.check_session('91000000-0000-4000-8000-000000000001');
SELECT pg_temp.check_true(
 jsonb_array_length(public.list_purchase_request_events(current_setting('qitaa.test.request_a')::uuid))=1,
 'buyer can read request history through the participant RPC');
-- Buyer A sees only their own request event.
SELECT pg_temp.check_true(
 (SELECT count(*)=1 AND min(to_status)='requested' AND min(from_status) IS NULL
  FROM public.purchase_request_events
  WHERE request_id=current_setting('qitaa.test.request_a')::uuid),
 'request creation is recorded as the first event');
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',false);
SELECT pg_temp.expect_denial(
 'SELECT public.list_admin_purchase_requests()',
 'P0001','admin access required');
SELECT pg_temp.check_true(
 (SELECT count(*)=0 FROM public.purchase_request_events
  WHERE request_id=current_setting('qitaa.test.request_a')::uuid),
 'another buyer cannot read the request event history');
SELECT pg_temp.expect_denial(
 'SELECT public.list_admin_purchase_requests()',
 'P0001','admin access required');
SELECT pg_temp.expect_denial(
 format('SELECT public.list_purchase_request_events(%L::uuid)',
  current_setting('qitaa.test.request_a')::uuid),
 'P0001','request not accessible');

-- Seller A can read the request history and transition it.
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',false);
SELECT pg_temp.check_session('91000000-0000-4000-8000-000000000003');
SELECT pg_temp.check_true(
 (SELECT count(*)=1 FROM public.purchase_request_events
  WHERE request_id=current_setting('qitaa.test.request_a')::uuid),
 'the verified owning seller can read the request history');
SELECT pg_temp.expect_denial(
 'SELECT public.list_admin_purchase_requests()',
 'P0001','admin access required');
SELECT pg_temp.check_true(
 public.seller_respond_to_request(current_setting('qitaa.test.request_a')::uuid,'accept')='accept',
 'seller acceptance records through the existing transition RPC');
SELECT pg_temp.check_true(
 (SELECT count(*)=2
    AND min(from_status) FILTER (WHERE to_status='accepted')='requested'
    AND min(actor_id::text) FILTER (WHERE to_status='accepted')='91000000-0000-4000-8000-000000000003'
  FROM public.purchase_request_events
  WHERE request_id=current_setting('qitaa.test.request_a')::uuid),
 'acceptance history captures prior status and acting seller');
SELECT pg_temp.check_true(
 jsonb_array_length(public.list_purchase_request_events(current_setting('qitaa.test.request_a')::uuid))=2,
 'seller participant RPC returns the appended acceptance event');

-- The authenticated client cannot forge or rewrite audit history.
SELECT pg_temp.expect_denial(
 format('UPDATE public.purchase_request_events SET to_status=''forged'' WHERE request_id=%L::uuid',
  current_setting('qitaa.test.request_a')::uuid),
 '42501','permission denied for table purchase_request_events');
SELECT pg_temp.expect_denial(
 format('DELETE FROM public.purchase_request_events WHERE request_id=%L::uuid',
  current_setting('qitaa.test.request_a')::uuid),
 '42501','permission denied for table purchase_request_events');
SELECT pg_temp.expect_denial(
 format('INSERT INTO public.purchase_request_events(request_id,to_status) VALUES (%L::uuid,''forged'')',
  current_setting('qitaa.test.request_a')::uuid),
 '42501','permission denied for table purchase_request_events');

-- Buyer cancellation is also recorded with correct actor and transition.
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',false);
SELECT pg_temp.check_true(
 public.buyer_cancel_request(current_setting('qitaa.test.request_a')::uuid),
 'buyer cancellation remains available');
SELECT pg_temp.check_true(
 (SELECT count(*)=3
    AND min(from_status) FILTER (WHERE to_status='cancelled')='accepted'
    AND min(actor_id::text) FILTER (WHERE to_status='cancelled')='91000000-0000-4000-8000-000000000001'
  FROM public.purchase_request_events
  WHERE request_id=current_setting('qitaa.test.request_a')::uuid),
 'cancellation appends a third event attributed to the buyer');
SELECT pg_temp.check_true(
 jsonb_array_length(public.list_purchase_request_events(current_setting('qitaa.test.request_a')::uuid))=3,
 'buyer participant RPC returns the complete request history');

ROLLBACK;
\echo 'purchase_request_audit.sql PASS (synthetic fixture rolled back)'
