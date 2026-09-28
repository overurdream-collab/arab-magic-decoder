
-- ============ helper: updated_at ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- ============ roles ============
CREATE TYPE public.app_role AS ENUM ('customer','workshop','quick_service','seller','delivery','admin');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  city TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ catalog reference data ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories" ON public.categories FOR SELECT USING (true);

CREATE TABLE public.vehicle_makes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  country TEXT,
  wmi_codes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicle_makes TO anon, authenticated;
GRANT ALL ON public.vehicle_makes TO service_role;
ALTER TABLE public.vehicle_makes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read makes" ON public.vehicle_makes FOR SELECT USING (true);

CREATE TABLE public.vehicle_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id UUID NOT NULL REFERENCES public.vehicle_makes(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  year_start INT NOT NULL DEFAULT 2000,
  year_end INT NOT NULL DEFAULT 2026,
  engine TEXT,
  body_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicle_models TO anon, authenticated;
GRANT ALL ON public.vehicle_models TO service_role;
ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read models" ON public.vehicle_models FOR SELECT USING (true);

CREATE TABLE public.catalog_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  oem_number TEXT NOT NULL UNIQUE,
  alt_numbers TEXT[] NOT NULL DEFAULT '{}',
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.catalog_parts TO anon, authenticated;
GRANT ALL ON public.catalog_parts TO service_role;
ALTER TABLE public.catalog_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read parts" ON public.catalog_parts FOR SELECT USING (true);
CREATE TRIGGER trg_parts_updated BEFORE UPDATE ON public.catalog_parts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.part_fitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES public.catalog_parts(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  year_from INT NOT NULL DEFAULT 2000,
  year_to INT NOT NULL DEFAULT 2026,
  notes_ar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (part_id, model_id, year_from, year_to)
);
GRANT SELECT ON public.part_fitments TO anon, authenticated;
GRANT ALL ON public.part_fitments TO service_role;
ALTER TABLE public.part_fitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read fitments" ON public.part_fitments FOR SELECT USING (true);

CREATE TABLE public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  seller_type TEXT NOT NULL DEFAULT 'new_parts',
  city TEXT NOT NULL,
  district TEXT,
  phone TEXT,
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  reviews_count INT NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sellers TO anon, authenticated;
GRANT INSERT, UPDATE ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read sellers" ON public.sellers FOR SELECT USING (true);
CREATE POLICY "owner manages seller" ON public.sellers FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_sellers_updated BEFORE UPDATE ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.seller_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.catalog_parts(id) ON DELETE CASCADE,
  price_yer NUMERIC(12,2) NOT NULL,
  stock_qty INT NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'new',
  quality_grade TEXT NOT NULL DEFAULT 'oem',
  origin_country TEXT,
  warranty_months INT NOT NULL DEFAULT 0,
  delivery_days INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seller_offers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seller_offers TO authenticated;
GRANT ALL ON public.seller_offers TO service_role;
ALTER TABLE public.seller_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read offers" ON public.seller_offers FOR SELECT USING (is_active);
CREATE POLICY "seller manages own offers" ON public.seller_offers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid()));
CREATE TRIGGER trg_offers_updated BEFORE UPDATE ON public.seller_offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_offers_part ON public.seller_offers(part_id);

-- ============ my garage ============
CREATE TABLE public.customer_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  make_id UUID REFERENCES public.vehicle_makes(id) ON DELETE SET NULL,
  model_id UUID REFERENCES public.vehicle_models(id) ON DELETE SET NULL,
  vin TEXT,
  year INT,
  engine TEXT,
  nickname TEXT,
  license_plate TEXT,
  current_mileage INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_vehicles TO authenticated;
GRANT ALL ON public.customer_vehicles TO service_role;
ALTER TABLE public.customer_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vehicles" ON public.customer_vehicles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.customer_vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.vehicle_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.customer_vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL DEFAULT 'oil_change',
  current_mileage INT NOT NULL,
  next_due_mileage INT NOT NULL,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due_date DATE,
  product_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  cost_total NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_maintenance_logs TO authenticated;
GRANT ALL ON public.vehicle_maintenance_logs TO service_role;
ALTER TABLE public.vehicle_maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs" ON public.vehicle_maintenance_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_logs_updated BEFORE UPDATE ON public.vehicle_maintenance_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_logs_vehicle ON public.vehicle_maintenance_logs(vehicle_id);
