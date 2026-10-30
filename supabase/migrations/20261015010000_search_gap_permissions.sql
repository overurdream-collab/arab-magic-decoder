-- Qitaa demand analytics: keep the raw aggregate table private and RPC-only for writes.
-- Existing analytics rows are preserved.
REVOKE ALL ON TABLE public.search_gap_counts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.search_gap_counts TO authenticated;
-- RLS allows only admins to read aggregate data; reporting is via the bounded RPC.
REVOKE ALL ON FUNCTION public.admin_search_gap_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_search_gap_summary() TO authenticated;
REVOKE ALL ON FUNCTION public.record_zero_result_search(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_zero_result_search(text) TO anon, authenticated;
