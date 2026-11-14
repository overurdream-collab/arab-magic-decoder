-- Append-only audit history for purchase request creation and status transitions.
-- No payment/delivery settlement is implied by these request events.
CREATE TABLE public.purchase_request_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status text,
  to_status text NOT NULL,
  review_note text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX purchase_request_events_request_order
  ON public.purchase_request_events(request_id, id);

ALTER TABLE public.purchase_request_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.purchase_request_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.purchase_request_events TO authenticated;
CREATE POLICY "participants read request events" ON public.purchase_request_events
 FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.purchase_requests r
    WHERE r.id = purchase_request_events.request_id
      AND (
        r.buyer_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.sellers s
          WHERE s.id = r.seller_id
            AND s.owner_id = (SELECT auth.uid())
            AND s.is_verified
        )
      )
  )
);

CREATE OR REPLACE FUNCTION public.log_purchase_request_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.purchase_request_events
      (request_id, actor_id, from_status, to_status, review_note)
    VALUES (NEW.id, auth.uid(), NULL, NEW.status, NEW.review_note);
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.purchase_request_events
      (request_id, actor_id, from_status, to_status, review_note)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status, NEW.review_note);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.log_purchase_request_event() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER purchase_request_events_on_create
 AFTER INSERT ON public.purchase_requests
 FOR EACH ROW EXECUTE FUNCTION public.log_purchase_request_event();
CREATE TRIGGER purchase_request_events_on_transition
 AFTER UPDATE OF status ON public.purchase_requests
 FOR EACH ROW EXECUTE FUNCTION public.log_purchase_request_event();
