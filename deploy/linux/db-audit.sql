-- Read-only. Run as DB auditor after migrations and runtime grants.
SELECT current_database(), current_user, version();
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls, rolconnlimit
FROM pg_roles WHERE rolname IN ('paynship_app', 'anon', 'authenticated');
SELECT schemaname, tablename, tableowner, rowsecurity
FROM pg_tables WHERE schemaname = 'public'
ORDER BY tablename;
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('paynship_app', 'anon', 'authenticated', 'PUBLIC')
ORDER BY grantee, table_name, privilege_type;
SELECT grantee, table_name, column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND grantee IN ('paynship_app', 'anon', 'authenticated', 'PUBLIC')
ORDER BY table_name, column_name;
SELECT pg_get_userbyid(roleid) AS granted_role, pg_get_userbyid(member) AS member_role
FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname = 'paynship_app');
