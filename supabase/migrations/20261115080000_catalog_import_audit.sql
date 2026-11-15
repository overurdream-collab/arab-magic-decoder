-- Append-only audit history for staging and applying reviewed catalog import batches.
-- The log records metadata only, never the imported payload or preview contents.
CREATE TABLE public.catalog_import_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_id uuid NOT NULL,
  actor_id uuid,
  source_name text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('staged','applied')),
  status text NOT NULL CHECK (status IN ('staged','applied')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX catalog_import_events_batch_order
  ON public.catalog_import_events(batch_id, id);

ALTER TABLE public.catalog_import_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalog_import_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.catalog_import_events TO authenticated;

CREATE POLICY "admins read catalog import events"
  ON public.catalog_import_events
  FOR SELECT TO authenticated
  USING ((SELECT public.is_current_user_admin()));

CREATE OR REPLACE FUNCTION public.log_catalog_import_event()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $audit$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.catalog_import_events
      (batch_id, actor_id, source_name, event_type, status)
    VALUES
      (NEW.id, auth.uid(), NEW.source_name, 'staged', NEW.status);
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.catalog_import_events
      (batch_id, actor_id, source_name, event_type, status)
    VALUES
      (NEW.id, coalesce(auth.uid(), NEW.applied_by), NEW.source_name,
       'applied', NEW.status);
  END IF;
  RETURN NEW;
END;
$audit$;

REVOKE ALL ON FUNCTION public.log_catalog_import_event() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER catalog_import_events_on_stage
  AFTER INSERT ON public.catalog_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.log_catalog_import_event();
CREATE TRIGGER catalog_import_events_on_status_change
  AFTER UPDATE OF status ON public.catalog_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.log_catalog_import_event();

CREATE OR REPLACE FUNCTION public.prevent_catalog_import_event_mutation()
RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $audit$
BEGIN
  RAISE EXCEPTION 'catalog import audit events are append-only';
END;
$audit$;

REVOKE ALL ON FUNCTION public.prevent_catalog_import_event_mutation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER catalog_import_events_append_only
  BEFORE UPDATE OR DELETE ON public.catalog_import_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_catalog_import_event_mutation();
