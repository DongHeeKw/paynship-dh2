-- Only a disposable CI database. Never execute against customer/production data.
-- Invoke with PGOPTIONS='-c paynship.ephemeral_ci=true' and dbname paynship_ci.
\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE item RECORD;
BEGIN
  IF current_database() <> 'paynship_ci'
     OR current_setting('paynship.ephemeral_ci', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'This smoke test is restricted to the explicit disposable CI database';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'paynship_app'
     AND rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
     AND NOT rolreplication AND NOT rolbypassrls) THEN
    RAISE EXCEPTION 'Application role attributes are too privileged';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname = 'paynship_app')) THEN
    RAISE EXCEPTION 'Application role inherits another role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tableowner = 'paynship_app') THEN
    RAISE EXCEPTION 'Application role must not own tables';
  END IF;
  IF has_schema_privilege('paynship_app', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'Application role has schema DDL permission';
  END IF;
  FOR item IN SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' LOOP
    IF NOT item.rowsecurity THEN RAISE EXCEPTION 'RLS missing on %', item.tablename; END IF;
    IF has_table_privilege('anon', format('%I.%I', item.schemaname, item.tablename), 'SELECT,INSERT,UPDATE,DELETE')
       OR has_table_privilege('authenticated', format('%I.%I', item.schemaname, item.tablename), 'SELECT,INSERT,UPDATE,DELETE')
       OR has_any_column_privilege('anon', format('%I.%I', item.schemaname, item.tablename), 'SELECT,INSERT,UPDATE')
       OR has_any_column_privilege('authenticated', format('%I.%I', item.schemaname, item.tablename), 'SELECT,INSERT,UPDATE') THEN
      RAISE EXCEPTION 'Browser role can access %', item.tablename;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
     AND ('public' = ANY(roles) OR 'anon' = ANY(roles) OR 'authenticated' = ANY(roles))) THEN
    RAISE EXCEPTION 'A browser/PUBLIC policy survived';
  END IF;
END $$;

SET LOCAL ROLE paynship_app;
INSERT INTO public.users (id, email, is_admin) VALUES
  ('11111111-1111-4111-8111-111111111111', 'ci-smoke@example.invalid', false);
INSERT INTO public.delivery_profiles (user_id, encrypted_data, updated_at)
VALUES ('11111111-1111-4111-8111-111111111111', 'ci-only-ciphertext-fixture', now());
INSERT INTO public.purchase_requests (
  id, user_id, source_url, category, quantity, options, destination,
  encrypted_delivery, idempotency_key, payload_hash, updated_at
) VALUES (
  '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
  'https://www.coupang.com/vp/products/123', 'books', 1, 'ci-only-ciphertext-fixture',
  'JP', 'ci-only-ciphertext-fixture', '33333333-3333-4333-8333-333333333333', 'ci-fixture', now()
);
INSERT INTO public.purchase_events (id, request_id, actor_id, source, status, message)
VALUES ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111', 'customer', 'REVIEW_REQUIRED', 'ci-only-ciphertext-fixture');
INSERT INTO public.purchase_support_tickets (id, request_id, subject, message, updated_at)
VALUES ('55555555-5555-4555-8555-555555555555', '22222222-2222-4222-8222-222222222222',
  'ci-only-ciphertext-fixture', 'ci-only-ciphertext-fixture', now());
INSERT INTO public.purchase_quotas (key, bucket, count) VALUES ('ci-smoke', '2026-10-12', 1);
INSERT INTO public.purchase_webhook_receipts (id, provider) VALUES ('ci-smoke-receipt', 'ci');
INSERT INTO public.admin_audit_logs (id, admin_user_id, action, target, changes)
VALUES ('66666666-6666-4666-8666-666666666666', '11111111-1111-4111-8111-111111111111',
  'ci_smoke', 'ci_fixture', '{}'::jsonb);
UPDATE public.users SET email = 'ci-smoke-updated@example.invalid' WHERE id = '11111111-1111-4111-8111-111111111111';
UPDATE public.admin_settings SET maintenance_mode = true, updated_at = now();

DO $$
BEGIN
  IF (SELECT count(*) FROM public.purchase_requests WHERE id = '22222222-2222-4222-8222-222222222222') <> 1 THEN
    RAISE EXCEPTION 'Application role cannot read inserted request';
  END IF;
  BEGIN
    INSERT INTO public.users (id, email, is_admin)
    VALUES ('77777777-7777-4777-8777-777777777777', 'ci-forged-admin@example.invalid', true);
    RAISE EXCEPTION 'Application role could create an administrator';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.users SET is_admin = true WHERE id = '11111111-1111-4111-8111-111111111111';
    RAISE EXCEPTION 'Application role could change is_admin';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    CREATE TABLE public.ci_forbidden_ddl (id integer);
    RAISE EXCEPTION 'Application role could create a table';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    TRUNCATE public.purchase_requests;
    RAISE EXCEPTION 'Application role could truncate requests';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.purchase_events;
    RAISE EXCEPTION 'Application role could erase append-only event evidence';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM 1 FROM public.orders;
    RAISE EXCEPTION 'Application role could access retired orders';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.purchase_requests SET quantity = 50000 WHERE id = '22222222-2222-4222-8222-222222222222';
    RAISE EXCEPTION 'Database did not enforce quantity bound';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.purchase_requests SET status = 'FORGED' WHERE id = '22222222-2222-4222-8222-222222222222';
    RAISE EXCEPTION 'Database did not enforce status bound';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.purchase_requests;
    RAISE EXCEPTION 'Anonymous role could read purchase requests';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.users SET is_admin = true;
    RAISE EXCEPTION 'Anonymous role could write administrator flags';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.delivery_profiles;
    RAISE EXCEPTION 'Browser authenticated role could read private profiles';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
\echo 'Disposable DB smoke passed; all synthetic fixture changes rolled back.'
