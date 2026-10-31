#!/usr/bin/env bash
# Executes one reviewed migration only; no automatic resets or rollback deletes.
set -euo pipefail
umask 077
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
migration="$repo_root/prisma/sql/2026-10-11-purchase-flow.sql"
expected="${PAYNSHIP_MIGRATION_EXPECTED_SHA256:?Set the approved release SQL SHA256}"
[[ "$expected" =~ ^[a-f0-9]{64}$ ]] || { echo "Invalid approved SQL hash" >&2; exit 1; }
actual="$(sha256sum "$migration" | cut -d ' ' -f 1)"
[[ "$actual" == "$expected" ]] || { echo "SQL differs from the approved release" >&2; exit 1; }
if [[ "${1:-}" != "--apply" ]]; then
  echo "Verified local purchase migration hash: $actual"
  echo "No DB connection or change. Use --apply after backup and target review."
  exit 0
fi
[[ -n "${PGSERVICE:-}" && -n "${PGSERVICEFILE:-}" ]] || { echo "Set explicit migration PGSERVICE and PGSERVICEFILE" >&2; exit 1; }
command -v psql >/dev/null || { echo "Install the matching PostgreSQL client" >&2; exit 1; }
psql -X --set=ON_ERROR_STOP=1 --command='SELECT current_database(), current_user, inet_server_addr(), inet_server_port();'
work="$(mktemp -d)"
trap 'rm -f -- "$work/migration-body.sql" "$work/apply.sql"; rmdir -- "$work"' EXIT
# This known source has its own BEGIN/COMMIT. The ledger joins the same transaction.
sed 's/\r$//; /^BEGIN;$/d; /^COMMIT;$/d' "$migration" > "$work/migration-body.sql"
cat > "$work/apply.sql" <<'SQL'
\set ON_ERROR_STOP on
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('paynship-release-migrations'));
CREATE SCHEMA IF NOT EXISTS ops;
REVOKE ALL ON SCHEMA ops FROM PUBLIC;
CREATE TABLE IF NOT EXISTS ops.release_migrations (
  id TEXT PRIMARY KEY, sha256 TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by TEXT NOT NULL DEFAULT current_user
);
REVOKE ALL ON ops.release_migrations FROM PUBLIC;
SELECT EXISTS (SELECT 1 FROM ops.release_migrations WHERE id = '2026-10-11-purchase-flow') AS applied \gset
\if :applied
  SELECT sha256 = :'expected_hash' AS same_hash FROM ops.release_migrations WHERE id = '2026-10-11-purchase-flow' \gset
  \if :same_hash
    ROLLBACK;
    \echo 'Same migration already applied; no change.'
    \quit
  \else
    DO $$ BEGIN RAISE EXCEPTION 'Previously applied migration has a different checksum'; END $$;
  \endif
\endif
\i :body_file
INSERT INTO ops.release_migrations (id, sha256) VALUES ('2026-10-11-purchase-flow', :'expected_hash');
COMMIT;
SQL
psql -X --set=ON_ERROR_STOP=1 --set=expected_hash="$expected" --set=body_file="$work/migration-body.sql" --file="$work/apply.sql"
