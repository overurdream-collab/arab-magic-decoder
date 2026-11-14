-- Participant-scoped reader for append-only purchase request history.
CREATE OR REPLACE FUNCTION public.list_purchase_request_events(_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE events jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.purchase_requests r
  WHERE r.id = _request_id
    AND (
     r.buyer_id = auth.uid()
     OR EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = r.seller_id AND s.owner_id = auth.uid() AND s.is_verified
     )
    )
 ) THEN RAISE EXCEPTION 'request not accessible'; END IF;

 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id', e.id,
   'actor_id', e.actor_id,
   'from_status', e.from_status,
   'to_status', e.to_status,
   'review_note', e.review_note,
   'occurred_at', e.occurred_at
 ) ORDER BY e.id), '[]'::jsonb)
 INTO events
 FROM public.purchase_request_events e
 WHERE e.request_id = _request_id;
 RETURN events;
END;
$$;
REVOKE ALL ON FUNCTION public.list_purchase_request_events(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_purchase_request_events(uuid) TO authenticated;
