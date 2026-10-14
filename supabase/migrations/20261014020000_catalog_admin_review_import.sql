-- Reviewable master-catalog import. No automatic live catalog mutations.
CREATE TABLE IF NOT EXISTS public.catalog_import_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 source_name text NOT NULL CHECK(length(source_name) BETWEEN 1 AND 120),
 payload jsonb NOT NULL,
 preview jsonb NOT NULL,
 status text NOT NULL DEFAULT 'staged' CHECK(status IN ('staged','applied')),
 created_at timestamptz NOT NULL DEFAULT now(),
 applied_at timestamptz,
 applied_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.catalog_import_batches ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.catalog_import_batches TO authenticated;
DROP POLICY IF EXISTS "admin reads catalog batches" ON public.catalog_import_batches;
CREATE POLICY "admin reads catalog batches" ON public.catalog_import_batches
 FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.admin_stage_catalog(
 _items jsonb, _source text DEFAULT 'catalog.csv') RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE r jsonb; oem text; label_ar text; label_en text; slug text;
 cats uuid; existing uuid; previous_at timestamptz;
 preview jsonb := '[]'::jsonb; new_items int:=0; updates int:=0; staged_id uuid;
 seen text[] := ARRAY[]::text[];
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) NOT BETWEEN 1 AND 200 THEN
  RAISE EXCEPTION '1-200 records required';
 END IF;
 IF length(btrim(coalesce(_source,''))) NOT BETWEEN 1 AND 120 THEN
  RAISE EXCEPTION 'invalid source name';
 END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(_items) LOOP
  oem:=upper(btrim(coalesce(r->>'oem_number','')));
  label_ar:=btrim(coalesce(r->>'name_ar',''));
  label_en:=btrim(coalesce(r->>'name_en',''));
  slug:=lower(btrim(coalesce(r->>'category_slug','')));
  IF oem !~ '^[A-Z0-9][A-Z0-9._/ -]{1,79}$'
   OR length(label_ar) NOT BETWEEN 2 AND 160
   OR length(label_en) NOT BETWEEN 2 AND 160
   OR length(slug) NOT BETWEEN 2 AND 80
   OR length(coalesce(r->>'alt_numbers','')) > 1000
  THEN RAISE EXCEPTION 'invalid catalog CSV item'; END IF;
  IF oem=ANY(seen) THEN RAISE EXCEPTION 'duplicate OEM in file: %',oem; END IF;
  seen:=array_append(seen,oem);
  SELECT id INTO cats FROM public.categories WHERE lower(categories.slug)=slug;
  IF cats IS NULL THEN RAISE EXCEPTION 'unknown category: %',slug; END IF;
  existing:=NULL;previous_at:=NULL;
  SELECT id,updated_at INTO existing,previous_at
    FROM public.catalog_parts WHERE upper(oem_number)=oem;
  IF existing IS NULL THEN new_items:=new_items+1; ELSE updates:=updates+1; END IF;
  preview:=preview||jsonb_build_array(jsonb_build_object(
   'oem_number',oem,'name_ar',label_ar,'name_en',label_en,
   'category_id',cats,'category_slug',slug,'alt_numbers',coalesce(r->>'alt_numbers',''),
   'existing_id',existing,'existing_updated_at',previous_at,
   'action',CASE WHEN existing IS NULL THEN 'insert' ELSE 'update' END));
 END LOOP;
 INSERT INTO public.catalog_import_batches(created_by,source_name,payload,preview)
 VALUES(auth.uid(),btrim(_source),_items,preview) RETURNING id INTO staged_id;
 RETURN jsonb_build_object('batch_id',staged_id,'added',new_items,'updated',updates,'preview',preview);
END $$;

CREATE OR REPLACE FUNCTION public.admin_commit_catalog(_id uuid) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE batch public.catalog_import_batches; r jsonb; alts text[];
 created int:=0; modified int:=0; current_at timestamptz;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO batch FROM public.catalog_import_batches WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR batch.status<>'staged' THEN RAISE EXCEPTION 'not a staged batch'; END IF;
 IF batch.created_at < now()-interval '24 hours' THEN RAISE EXCEPTION 'staged batch expired'; END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(batch.preview) LOOP
  SELECT coalesce(array_agg(DISTINCT upper(btrim(x))),ARRAY[]::text[]) INTO alts
   FROM unnest(string_to_array(r->>'alt_numbers','|')) x
   WHERE length(btrim(x)) BETWEEN 2 AND 80 AND upper(btrim(x))<>(r->>'oem_number');
  IF r->>'action'='insert' THEN
   IF EXISTS(SELECT 1 FROM public.catalog_parts WHERE upper(oem_number)=r->>'oem_number')
   THEN RAISE EXCEPTION 'OEM already added: %',r->>'oem_number'; END IF;
   INSERT INTO public.catalog_parts(category_id,oem_number,name_ar,name_en,alt_numbers)
   VALUES((r->>'category_id')::uuid,r->>'oem_number',r->>'name_ar',r->>'name_en',alts);
   created:=created+1;
  ELSIF r->>'action'='update' THEN
   SELECT updated_at INTO current_at FROM public.catalog_parts
    WHERE id=(r->>'existing_id')::uuid FOR UPDATE;
   IF current_at IS NULL OR current_at IS DISTINCT FROM (r->>'existing_updated_at')::timestamptz
   THEN RAISE EXCEPTION 'catalog changed since staging for %',r->>'oem_number'; END IF;
   UPDATE public.catalog_parts SET category_id=(r->>'category_id')::uuid,
    name_ar=r->>'name_ar',name_en=r->>'name_en',alt_numbers=alts
    WHERE id=(r->>'existing_id')::uuid;
   modified:=modified+1;
  ELSE RAISE EXCEPTION 'unknown staging operation'; END IF;
 END LOOP;
 UPDATE public.catalog_import_batches SET status='applied',applied_at=now(),applied_by=auth.uid()
 WHERE id=_id;
 RETURN jsonb_build_object('added',created,'updated',modified);
END $$;

REVOKE ALL ON FUNCTION public.admin_stage_catalog(jsonb,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_commit_catalog(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_stage_catalog(jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_commit_catalog(uuid) TO authenticated;
