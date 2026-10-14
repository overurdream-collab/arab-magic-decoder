-- Analytics: aggregate unsuccessful searches without storing accounts, IPs or VINs.
CREATE TABLE public.search_gap_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  day date NOT NULL DEFAULT CURRENT_DATE,
  hits integer NOT NULL DEFAULT 0 CHECK(hits >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (term,day)
);
CREATE INDEX idx_search_gap_counts_day ON public.search_gap_counts(day DESC,hits DESC);
ALTER TABLE public.search_gap_counts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.search_gap_counts TO authenticated;
CREATE POLICY "admin views missing product demand" ON public.search_gap_counts
 FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.record_zero_result_search(_term text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE normalized text;
BEGIN
 normalized:=lower(btrim(regexp_replace(coalesce(_term,''),'[[:space:]]+',' ','g')));
 IF length(normalized) NOT BETWEEN 3 AND 80 THEN RETURN false; END IF;
 -- Do not retain customer contact info or 17-character VIN strings.
 IF normalized LIKE '%@%' OR normalized ~ '[0-9]{7,}'
 OR normalized ~* '(^|[[:space:]])[A-HJ-NPR-Z0-9]{17}([[:space:]]|$)'
 OR normalized ~ '[+]' THEN RETURN false; END IF;
 IF normalized !~ '[[:alpha:][:digit:]]' THEN RETURN false; END IF;
 -- Prevent runaway unique-row growth during automated traffic storms.
 IF (SELECT count(*) FROM public.search_gap_counts WHERE day=CURRENT_DATE) >= 1000
 AND NOT EXISTS(SELECT 1 FROM public.search_gap_counts WHERE day=CURRENT_DATE AND term=normalized)
 THEN RETURN false; END IF;
 INSERT INTO public.search_gap_counts(term,day,hits)
 VALUES(normalized,CURRENT_DATE,1)
 ON CONFLICT (term,day)
 DO UPDATE SET hits=LEAST(public.search_gap_counts.hits+1,10000),last_seen_at=now();
 RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.record_zero_result_search(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_zero_result_search(text) TO anon,authenticated;
