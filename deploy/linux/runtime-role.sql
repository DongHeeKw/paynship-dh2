-- Run only after purchase SQL, as the schema owner/DB administrator.
-- This is a server role, never a Supabase browser/JWT role.
-- Initial creation: intentionally fails if the role exists; inspect it first.
BEGIN;
CREATE ROLE paynship_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS NOINHERIT CONNECTION LIMIT 20 PASSWORD NULL;
DO $$ BEGIN EXECUTE format('GRANT CONNECT ON DATABASE %I TO paynship_app', current_database()); END $$;
GRANT USAGE ON SCHEMA public TO paynship_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_profiles TO paynship_app;
GRANT SELECT, INSERT, UPDATE ON public.purchase_requests TO paynship_app;
GRANT SELECT, INSERT ON public.purchase_events TO paynship_app;
GRANT SELECT, INSERT, UPDATE ON public.purchase_support_tickets TO paynship_app;
GRANT SELECT, INSERT, UPDATE ON public.purchase_quotas TO paynship_app;
GRANT SELECT, INSERT ON public.purchase_webhook_receipts TO paynship_app;
GRANT SELECT, INSERT ON public.users TO paynship_app;
GRANT UPDATE (email) ON public.users TO paynship_app;
GRANT SELECT, INSERT ON public.admin_audit_logs TO paynship_app;
GRANT SELECT ON public.admin_settings TO paynship_app;
GRANT UPDATE (maintenance_mode, shopify_enabled, updated_at) ON public.admin_settings TO paynship_app;

CREATE POLICY paynship_server_profile ON public.delivery_profiles TO paynship_app USING (true) WITH CHECK (true);
CREATE POLICY paynship_server_request ON public.purchase_requests TO paynship_app USING (true) WITH CHECK (true);
CREATE POLICY paynship_server_event ON public.purchase_events TO paynship_app USING (true) WITH CHECK (true);
CREATE POLICY paynship_server_support ON public.purchase_support_tickets TO paynship_app USING (true) WITH CHECK (true);
CREATE POLICY paynship_server_quota ON public.purchase_quotas TO paynship_app USING (true) WITH CHECK (true);
CREATE POLICY paynship_server_receipt ON public.purchase_webhook_receipts TO paynship_app USING (true) WITH CHECK (true);
CREATE POLICY paynship_server_user_read ON public.users FOR SELECT TO paynship_app USING (true);
CREATE POLICY paynship_server_user_insert ON public.users FOR INSERT TO paynship_app WITH CHECK (is_admin = false);
CREATE POLICY paynship_server_user_email ON public.users FOR UPDATE TO paynship_app USING (true) WITH CHECK (true);
CREATE POLICY paynship_server_audit ON public.admin_audit_logs TO paynship_app USING (true) WITH CHECK (true);
CREATE POLICY paynship_server_settings ON public.admin_settings TO paynship_app USING (true) WITH CHECK (true);
-- Seed once as migration owner; runtime has no INSERT permission on settings.
INSERT INTO public.admin_settings (id, updated_at, maintenance_mode, use_mock_checkout, shopify_enabled)
SELECT gen_random_uuid()::text, CURRENT_TIMESTAMP, true, false, false
WHERE NOT EXISTS (SELECT 1 FROM public.admin_settings);
-- Do not GRANT ALL TABLES, table ownership, owner-role membership or BYPASSRLS.
COMMIT;
