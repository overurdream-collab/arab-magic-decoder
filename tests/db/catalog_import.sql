\set ON_ERROR_STOP on
-- Authorized administrator can stage without modifying central catalog.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
SELECT public.admin_stage_catalog(
 '[{"oem_number":"CSV-NEW-99","name_ar":"فلتر الزيت","name_en":"Oil filter","category_slug":"oil-filter","alt_numbers":"ALT-99|ALT-100"}]'::jsonb,
 'test.csv'
) result \gset
DO $$
BEGIN
 IF (SELECT count(*) FROM public.catalog_parts WHERE oem_number='CSV-NEW-99') <> 0
 THEN RAISE EXCEPTION 'stage unexpectedly changed catalog'; END IF;
END $$;
-- Commit in the same transaction. Double commit must fail.
SELECT public.admin_commit_catalog(
 (:'result'::jsonb->>'batch_id')::uuid
);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.catalog_parts WHERE oem_number='CSV-NEW-99') <> 1
 THEN RAISE EXCEPTION 'approved import was not applied'; END IF;
END $$;
DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM public.admin_commit_catalog(
   (SELECT id FROM public.catalog_import_batches WHERE source_name='test.csv')
  );
 EXCEPTION WHEN OTHERS THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'duplicate batch commit succeeded'; END IF;
END $$;
RESET ROLE;
-- Applicant cannot stage or commit.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.admin_stage_catalog(
  '[{"oem_number":"CSV-ATTACK-1","name_ar":"قطعة خادعة","name_en":"Bad record","category_slug":"oil-filter","alt_numbers":""}]'::jsonb,
  'tamper.csv');
 EXCEPTION WHEN OTHERS THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'unauthorized user staged catalog'; END IF;
END $$;
RESET ROLE;
SELECT 'catalog import authorization, staging, commit and replay guards PASS';
