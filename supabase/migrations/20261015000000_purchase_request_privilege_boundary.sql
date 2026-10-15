-- Qitaa: post-deployment hardening of purchase requests.
-- Existing rows are preserved; all state transitions must use authenticated RPCs.
REVOKE ALL ON TABLE public.purchase_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.purchase_requests TO authenticated;

-- Only signed-in users may invoke the state-transition functions.
REVOKE ALL ON FUNCTION public.create_purchase_request(uuid,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.seller_respond_to_request(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.buyer_cancel_request(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_purchase_request(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seller_respond_to_request(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buyer_cancel_request(uuid) TO authenticated;
