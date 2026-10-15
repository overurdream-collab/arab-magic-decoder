\set ON_ERROR_STOP on
-- Simulated registered customer requests a product from an admin-approved seller.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
SELECT public.create_purchase_request(
 (SELECT o.id FROM public.seller_offers o JOIN public.sellers s ON s.id=o.seller_id
  WHERE s.owner_id='11111111-1111-4111-8111-111111111111' LIMIT 1),2
) AS req_id \gset
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.seller_respond_to_request((SELECT id FROM public.purchase_requests WHERE buyer_id='22222222-2222-4222-8222-222222222222' ORDER BY created_at DESC LIMIT 1),'accept');
 EXCEPTION WHEN OTHERS THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'SECURITY FAILURE: buyer accepted order as seller'; END IF;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SELECT public.seller_respond_to_request((SELECT id FROM public.purchase_requests WHERE buyer_id='22222222-2222-4222-8222-222222222222' ORDER BY created_at DESC LIMIT 1),'accept');
RESET ROLE;
DO $$
DECLARE current_stock integer;
BEGIN
 SELECT o.stock_qty INTO current_stock FROM public.seller_offers o JOIN public.sellers s ON s.id=o.seller_id
 WHERE s.owner_id='11111111-1111-4111-8111-111111111111' LIMIT 1;
 IF current_stock<>1 THEN RAISE EXCEPTION 'accepted request did not reserve two units'; END IF;
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
SELECT public.buyer_cancel_request((SELECT id FROM public.purchase_requests WHERE buyer_id='22222222-2222-4222-8222-222222222222' ORDER BY created_at DESC LIMIT 1));
RESET ROLE;
DO $$
DECLARE current_stock integer;
BEGIN
 SELECT o.stock_qty INTO current_stock FROM public.seller_offers o JOIN public.sellers s ON s.id=o.seller_id
 WHERE s.owner_id='11111111-1111-4111-8111-111111111111' LIMIT 1;
 IF current_stock<>3 THEN RAISE EXCEPTION 'cancelled accepted request did not restore stock'; END IF;
 IF (SELECT status FROM public.purchase_requests WHERE id=(SELECT id FROM public.purchase_requests WHERE buyer_id='22222222-2222-4222-8222-222222222222' ORDER BY created_at DESC LIMIT 1))<>'cancelled'
 THEN RAISE EXCEPTION 'wrong cancellation status'; END IF;
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.seller_respond_to_request((SELECT id FROM public.purchase_requests WHERE buyer_id='22222222-2222-4222-8222-222222222222' ORDER BY created_at DESC LIMIT 1),'accept');
 EXCEPTION WHEN OTHERS THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'SECURITY FAILURE: cancelled request accepted again'; END IF;
END $$;
RESET ROLE;
SELECT 'request acceptance, seller ownership, stock reservation and cancellation PASS';
