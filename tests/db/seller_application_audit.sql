\set ON_ERROR_STOP on
-- Audit rows from the seller lifecycle exercised by seller_rls.sql.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
DO $$
DECLARE
  app_id uuid;
  event_count integer;
  event_types text[];
  decision_actor uuid;
BEGIN
  SELECT id INTO app_id FROM public.seller_applications
   WHERE user_id='11111111-1111-4111-8111-111111111111'
     AND business_name='Applicant Store';
  SELECT count(*), array_agg(event_type ORDER BY id)
    INTO event_count, event_types
    FROM public.seller_application_events WHERE application_id=app_id;
  IF event_count<>2 OR event_types<>ARRAY['submitted','approved']::text[] THEN
    RAISE EXCEPTION 'submission and approval audit history missing: %', event_types;
  END IF;
  SELECT actor_id INTO decision_actor FROM public.seller_application_events
   WHERE application_id=app_id AND event_type='approved';
  IF decision_actor<>'33333333-3333-4333-8333-333333333333'::uuid THEN
    RAISE EXCEPTION 'approval actor not recorded';
  END IF;
END $$;
RESET ROLE;

-- An unrelated applicant cannot read another account's audit history.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.seller_application_events
   WHERE applicant_id='11111111-1111-4111-8111-111111111111';
  IF n<>0 THEN RAISE EXCEPTION 'other applicant can read seller application events'; END IF;
END $$;
-- Authenticated users cannot forge, edit, or remove audit events.
DO $$
DECLARE denied boolean:=false;
BEGIN
  BEGIN
    INSERT INTO public.seller_application_events
      (application_id,applicant_id,event_type,to_status)
    VALUES (gen_random_uuid(),auth.uid(),'submitted','pending');
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'applicant forged seller application event'; END IF;

  denied:=false;
  BEGIN
    UPDATE public.seller_application_events SET review_note='tampered';
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'applicant edited audit event'; END IF;

  denied:=false;
  BEGIN
    DELETE FROM public.seller_application_events;
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'applicant deleted audit event'; END IF;
END $$;
RESET ROLE;

-- Rejection is a separate audited decision and remains visible to its applicant.
INSERT INTO auth.users(id) VALUES ('44444444-4444-4444-8444-444444444444');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
INSERT INTO public.seller_applications(user_id,business_name,seller_type,city,phone)
VALUES(auth.uid(),'Rejected Test Shop','used_parts','Sana','777000444');
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
SELECT public.reject_seller_application(
  (SELECT id FROM public.seller_applications WHERE user_id='44444444-4444-4444-8444-444444444444'),
  'Synthetic test rejection'
);
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
DO $$
DECLARE n integer; event_type text; actor uuid; note text;
BEGIN
  SELECT count(*) INTO n FROM public.seller_application_events
   WHERE applicant_id=auth.uid();
  IF n<>2 THEN RAISE EXCEPTION 'rejected applicant must see submission and decision events'; END IF;
  SELECT e.event_type,e.actor_id,e.review_note INTO event_type,actor,note
   FROM public.seller_application_events e
   JOIN public.seller_applications a ON a.id=e.application_id
   WHERE a.user_id=auth.uid() AND e.event_type='rejected';
  IF event_type<>'rejected'
     OR actor<>'33333333-3333-4333-8333-333333333333'::uuid
     OR note<>'Synthetic test rejection' THEN
    RAISE EXCEPTION 'rejection actor or note was not audited';
  END IF;
END $$;
RESET ROLE;

SET ROLE anon;
DO $$
DECLARE denied boolean:=false;
BEGIN
  BEGIN
    PERFORM * FROM public.seller_application_events;
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'anonymous role can access seller application events'; END IF;
END $$;
RESET ROLE;

-- The trigger also protects history from privileged UPDATE/DELETE paths.
DO $audit$
DECLARE blocked boolean:=false;
BEGIN
  BEGIN
    UPDATE public.seller_application_events SET review_note='tampered'
     WHERE event_type='approved';
  EXCEPTION WHEN OTHERS THEN
    blocked := SQLERRM='seller application audit events are append-only';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'append-only trigger did not block event update'; END IF;

  blocked:=false;
  BEGIN
    DELETE FROM public.seller_application_events WHERE event_type='approved';
  EXCEPTION WHEN OTHERS THEN
    blocked := SQLERRM='seller application audit events are append-only';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'append-only trigger did not block event deletion'; END IF;
END $audit$;
SELECT 'seller application audit history, actor attribution, append-only ACL and isolation PASS';
