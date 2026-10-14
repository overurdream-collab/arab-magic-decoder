\set ON_ERROR_STOP on
SET ROLE anon;
SELECT public.record_zero_result_search('فحمات فرامل') AS accepted \gset
SELECT public.record_zero_result_search('فحمات فرامل');
SELECT public.record_zero_result_search('1HGCM82633A004352') AS ignored_vin \gset
SELECT public.record_zero_result_search('ahmed@example.com') AS ignored_email \gset
RESET ROLE;
SELECT 1 / CASE WHEN
 (SELECT COUNT(*) FROM public.search_gap_counts WHERE term='فحمات فرامل' AND hits=2)=1
 AND (SELECT COUNT(*) FROM public.search_gap_counts)=1
 THEN 1 ELSE 0 END AS privacy_aggregate_ok;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
 PERFORM public.admin_search_gap_summary();
 EXCEPTION WHEN OTHERS THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'nonadmin queried private search analytics'; END IF;
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
DO $$
DECLARE r jsonb;
BEGIN
 r:=public.admin_search_gap_summary();
 IF jsonb_array_length(r)<>1 OR (r->0->>'total_hits')::integer<>2
 THEN RAISE EXCEPTION 'admin summary is incorrect'; END IF;
END $$;
RESET ROLE;
SELECT 'privacy-preserving zero-result analytics tests PASS';
