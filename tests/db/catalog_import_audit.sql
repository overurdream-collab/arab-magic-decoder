\set ON_ERROR_STOP on
-- Admin test.csv was staged and applied by catalog_import.sql.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
DO $audit$
DECLARE
  v_batch_id uuid;
  event_count integer;
  event_types text[];
  event_statuses text[];
  actors uuid[];
BEGIN
  SELECT e.batch_id INTO v_batch_id FROM public.catalog_import_events e WHERE e.source_name='test.csv' LIMIT 1;
  SELECT count(*), array_agg(event_type ORDER BY id), array_agg(status ORDER BY id),
         array_agg(actor_id ORDER BY id)
    INTO event_count, event_types, event_statuses, actors
    FROM public.catalog_import_events e WHERE e.batch_id=v_batch_id;
  IF event_count<>2
     OR event_types<>ARRAY['staged','applied']::text[]
     OR event_statuses<>ARRAY['staged','applied']::text[]
     OR actors<>ARRAY[
       '33333333-3333-4333-8333-333333333333'::uuid,
       '33333333-3333-4333-8333-333333333333'::uuid
     ] THEN
    RAISE EXCEPTION 'catalog batch audit sequence/actor missing: %, %, %',
      event_types,event_statuses,actors;
  END IF;
END
$audit$;
RESET ROLE;

-- A non-admin cannot read or forge catalog import events.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $audit$
DECLARE
  n integer;
  denied boolean:=false;
BEGIN
  SELECT count(*) INTO n FROM public.catalog_import_events;
  IF n<>0 THEN RAISE EXCEPTION 'non-admin can read catalog import audit events'; END IF;
  BEGIN
    INSERT INTO public.catalog_import_events
      (batch_id,source_name,event_type,status)
    VALUES (gen_random_uuid(),'spoof.csv','staged','staged');
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'non-admin forged catalog audit event'; END IF;
END
$audit$;
RESET ROLE;

SET ROLE anon;
DO $audit$
DECLARE denied boolean:=false;
BEGIN
  BEGIN
    PERFORM * FROM public.catalog_import_events;
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'anonymous role can read catalog import events'; END IF;
END
$audit$;
RESET ROLE;

-- Verify immutability triggers even for the database owner.
DO $audit$
DECLARE blocked boolean:=false;
BEGIN
  BEGIN
    UPDATE public.catalog_import_events SET source_name='tampered.csv';
  EXCEPTION WHEN OTHERS THEN
    blocked:=SQLERRM='catalog import audit events are append-only';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'append-only trigger did not block event update'; END IF;

  blocked:=false;
  BEGIN
    DELETE FROM public.catalog_import_events;
  EXCEPTION WHEN OTHERS THEN
    blocked:=SQLERRM='catalog import audit events are append-only';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'append-only trigger did not block event deletion'; END IF;
END
$audit$;
SELECT 'catalog import audit staging/application attribution and isolation PASS';
