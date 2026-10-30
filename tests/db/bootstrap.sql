\set ON_ERROR_STOP on
-- Disposable PostgreSQL test database only. Never run in Lovable's live DB.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT authenticated, anon, service_role TO CURRENT_USER;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE SET search_path = ''
AS $$
 SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
\i supabase/migrations/20260928003916_66863f3e-d0bc-4cfa-b294-cc354afab8eb.sql
\i supabase/migrations/20260928003924_21af022b-4b2e-4fe9-ba2e-0d0a7c861624.sql
\i drizzle/migrations/0000_seller_onboarding_admin_rls_hardening.sql
\i supabase/migrations/20261014000000_seller_read_scope_security.sql
\i supabase/migrations/20261014020000_catalog_admin_review_import.sql
\i supabase/migrations/20261014030000_search_gap_analytics.sql

\i supabase/migrations/20261014040000_purchase_requests.sql
\i supabase/migrations/20261015000000_purchase_request_privilege_boundary.sql
\i supabase/migrations/20261015010000_search_gap_permissions.sql
\i supabase/migrations/20261015020000_purchase_request_deduplication.sql
