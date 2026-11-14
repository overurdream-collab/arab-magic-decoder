-- Read-only administrator view of purchase-request operations.
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
     OR public.is_current_user_admin()
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
 INTO events FROM public.purchase_request_events e WHERE e.request_id = _request_id;
 RETURN events;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_admin_purchase_requests(_status text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE requests jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'admin access required'; END IF;
 IF _status IS NOT NULL AND _status NOT IN ('requested','accepted','rejected','cancelled','fulfilled') THEN
  RAISE EXCEPTION 'invalid status';
 END IF;

 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id', x.id,
   'buyer_name', x.buyer_name,
   'part_name', x.part_name,
   'seller_name', x.seller_name,
   'qty', x.qty,
   'price_yer', x.price_yer,
   'status', x.status,
   'review_note', x.review_note,
   'created_at', x.created_at,
   'accepted_at', x.accepted_at,
   'closed_at', x.closed_at
 ) ORDER BY x.created_at DESC), '[]'::jsonb)
 INTO requests
 FROM (
  SELECT r.id, coalesce(p.full_name,'عميل') AS buyer_name, cp.name_ar AS part_name,
   s.name AS seller_name, r.qty, r.price_yer, r.status, r.review_note,
   r.created_at, r.accepted_at, r.closed_at
  FROM public.purchase_requests r
  JOIN public.catalog_parts cp ON cp.id=r.part_id
  JOIN public.sellers s ON s.id=r.seller_id
  LEFT JOIN public.profiles p ON p.id=r.buyer_id
  WHERE _status IS NULL OR r.status=_status
  ORDER BY r.created_at DESC
  LIMIT 200
 ) x;
 RETURN requests;
END;
$$;
REVOKE ALL ON FUNCTION public.list_admin_purchase_requests(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_admin_purchase_requests(text) TO authenticated;
