-- Append-only audit history for seller application submissions and admin decisions.
-- Keep identifiers without cascading foreign keys so history survives account/application deletion.
CREATE TABLE public.seller_application_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id uuid NOT NULL,
  applicant_id uuid NOT NULL,
  actor_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('submitted','approved','rejected')),
  from_status text CHECK (from_status IS NULL OR from_status IN ('pending','approved','rejected')),
  to_status text NOT NULL CHECK (to_status IN ('pending','approved','rejected')),
  review_note text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX seller_application_events_application_order
  ON public.seller_application_events(application_id, id);

ALTER TABLE public.seller_application_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seller_application_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.seller_application_events TO authenticated;

CREATE POLICY "applicant and admin read seller application events"
  ON public.seller_application_events
  FOR SELECT TO authenticated
  USING (
    applicant_id = (SELECT auth.uid())
    OR (SELECT public.is_current_user_admin())
  );

CREATE OR REPLACE FUNCTION public.log_seller_application_event()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.seller_application_events
      (application_id, applicant_id, actor_id, event_type, from_status, to_status)
    VALUES
      (NEW.id, NEW.user_id, auth.uid(), 'submitted', NULL, NEW.status);
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.seller_application_events
      (application_id, applicant_id, actor_id, event_type, from_status, to_status, review_note)
    VALUES
      (NEW.id, NEW.user_id, coalesce(auth.uid(), NEW.reviewed_by),
       NEW.status, OLD.status, NEW.status, NEW.review_note);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_seller_application_event() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER seller_application_events_on_create
  AFTER INSERT ON public.seller_applications
  FOR EACH ROW EXECUTE FUNCTION public.log_seller_application_event();
CREATE TRIGGER seller_application_events_on_status_change
  AFTER UPDATE OF status ON public.seller_applications
  FOR EACH ROW EXECUTE FUNCTION public.log_seller_application_event();

CREATE OR REPLACE FUNCTION public.prevent_seller_application_event_mutation()
RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'seller application audit events are append-only';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_seller_application_event_mutation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER seller_application_events_append_only
  BEFORE UPDATE OR DELETE ON public.seller_application_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_seller_application_event_mutation();
