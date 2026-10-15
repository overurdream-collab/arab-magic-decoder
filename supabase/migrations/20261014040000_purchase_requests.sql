-- Qitaa request lifecycle. This is NOT a payment or completed purchase gateway.
CREATE TABLE public.purchase_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 buyer_id uuid NOT NULL REFERENCES auth.users(id),
 seller_id uuid NOT NULL REFERENCES public.sellers(id),
 offer_id uuid NOT NULL REFERENCES public.seller_offers(id),
 part_id uuid NOT NULL REFERENCES public.catalog_parts(id),
 qty integer NOT NULL CHECK (qty BETWEEN 1 AND 20),
 price_yer numeric(12,2) NOT NULL CHECK (price_yer > 0),
 status text NOT NULL DEFAULT 'requested'
   CHECK(status IN ('requested','accepted','rejected','cancelled','fulfilled')),
 review_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 accepted_at timestamptz,
 closed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX purchase_requests_buyer ON public.purchase_requests(buyer_id,created_at DESC);
CREATE INDEX purchase_requests_seller ON public.purchase_requests(seller_id,created_at DESC);
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.purchase_requests TO authenticated;
CREATE POLICY "buyer sees own requests" ON public.purchase_requests
 FOR SELECT TO authenticated USING (buyer_id=auth.uid());
CREATE POLICY "seller sees shop requests" ON public.purchase_requests
 FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.sellers s
 WHERE s.id=purchase_requests.seller_id AND s.owner_id=auth.uid() AND s.is_verified));
CREATE TRIGGER trg_purchase_requests_updated BEFORE UPDATE ON public.purchase_requests
 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.create_purchase_request(_offer_id uuid,_qty integer DEFAULT 1)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE offer public.seller_offers; request_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
 IF _qty NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'invalid quantity'; END IF;
 SELECT o.* INTO offer FROM public.seller_offers o
 JOIN public.sellers s ON s.id=o.seller_id
 WHERE o.id=_offer_id AND o.is_active AND s.is_verified;
 IF NOT FOUND OR offer.stock_qty<_qty THEN RAISE EXCEPTION 'offer unavailable'; END IF;
 INSERT INTO public.purchase_requests(buyer_id,seller_id,offer_id,part_id,qty,price_yer)
 VALUES(auth.uid(),offer.seller_id,offer.id,offer.part_id,_qty,offer.price_yer)
 RETURNING id INTO request_id;
 RETURN request_id;
END $$;

CREATE OR REPLACE FUNCTION public.seller_respond_to_request(_request_id uuid,_action text,_note text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE req public.purchase_requests; stock integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
 SELECT * INTO req FROM public.purchase_requests WHERE id=_request_id FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.sellers
  WHERE id=req.seller_id AND owner_id=auth.uid() AND is_verified)
 THEN RAISE EXCEPTION 'request not accessible'; END IF;
 IF _action='accept' AND req.status='requested' THEN
  SELECT stock_qty INTO stock FROM public.seller_offers
   WHERE id=req.offer_id AND seller_id=req.seller_id AND is_active FOR UPDATE;
  IF stock IS NULL OR stock<req.qty THEN RAISE EXCEPTION 'stock changed'; END IF;
  UPDATE public.seller_offers SET stock_qty=stock_qty-req.qty WHERE id=req.offer_id;
  UPDATE public.purchase_requests SET status='accepted',accepted_at=now() WHERE id=req.id;
 ELSIF _action='reject' AND req.status='requested' THEN
  UPDATE public.purchase_requests SET status='rejected',review_note=left(_note,500),closed_at=now() WHERE id=req.id;
 ELSIF _action='fulfill' AND req.status='accepted' THEN
  UPDATE public.purchase_requests SET status='fulfilled',closed_at=now() WHERE id=req.id;
 ELSE RAISE EXCEPTION 'invalid request state transition'; END IF;
 RETURN _action;
END $$;

CREATE OR REPLACE FUNCTION public.buyer_cancel_request(_request_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE req public.purchase_requests;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
 SELECT * INTO req FROM public.purchase_requests WHERE id=_request_id AND buyer_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR req.status NOT IN ('requested','accepted') THEN
  RAISE EXCEPTION 'request cannot be cancelled';
 END IF;
 IF req.status='accepted' THEN
  UPDATE public.seller_offers SET stock_qty=stock_qty+req.qty WHERE id=req.offer_id;
 END IF;
 UPDATE public.purchase_requests SET status='cancelled',closed_at=now() WHERE id=req.id;
 RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.create_purchase_request(uuid,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.seller_respond_to_request(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.buyer_cancel_request(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_purchase_request(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seller_respond_to_request(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buyer_cancel_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_purchase_requests()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE items jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO items FROM (
  SELECT r.id, r.qty, r.price_yer, r.status, r.created_at,
   r.review_note, p.name_ar AS part_name, s.name AS seller_name
  FROM public.purchase_requests r
  JOIN public.catalog_parts p ON p.id=r.part_id
  JOIN public.sellers s ON s.id=r.seller_id
  WHERE r.buyer_id=auth.uid()
  ORDER BY r.created_at DESC LIMIT 100
 ) x;
 RETURN items;
END $$;

CREATE OR REPLACE FUNCTION public.list_seller_purchase_requests()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE items jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO items FROM (
  SELECT r.id,r.qty,r.price_yer,r.status,r.created_at,p.name_ar AS part_name
  FROM public.purchase_requests r
  JOIN public.sellers s ON s.id=r.seller_id
  JOIN public.catalog_parts p ON p.id=r.part_id
  WHERE s.owner_id=auth.uid() AND s.is_verified
  ORDER BY r.created_at DESC LIMIT 100
 ) x;
 RETURN items;
END $$;
REVOKE ALL ON FUNCTION public.list_my_purchase_requests() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.list_seller_purchase_requests() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_my_purchase_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_seller_purchase_requests() TO authenticated;
