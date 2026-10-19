#!/usr/bin/env bash
# Run the DriverHub database business-flow tests on a LOCAL scratch Postgres.
# Never point this at the live Supabase project: it creates and drops a database.
#
#   PGHOST=127.0.0.1 PGPORT=54329 PGUSER=postgres bash supabase/tests/run-local.sh
#   bash supabase/tests/run-local.sh --missing-grants   # simulate the 2026-10 live state first
#
# Needs a superuser on a throwaway cluster (e.g. `initdb -A trust` + `pg_ctl start -o "-p 54329"`).
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PSQL="${PSQL:-psql}"
DB="${DB:-driverhub_test}"
export PGHOST="${PGHOST:-127.0.0.1}" PGPORT="${PGPORT:-54329}" PGUSER="${PGUSER:-postgres}"

"$PSQL" -qtA -d postgres -c "DROP DATABASE IF EXISTS $DB WITH (FORCE);" -c "CREATE DATABASE $DB;" >/dev/null || exit 1
apply() {
  if ! out=$("$PSQL" -d "$DB" -v ON_ERROR_STOP=1 -q -f "$1" 2>&1); then
    echo "FAIL applying $(basename "$1"):"; echo "$out" | grep -E 'ERROR' | head -3; exit 1
  fi
  echo "ok   $(basename "$1")"
}
apply "$HERE/00_supabase_stub.sql"
for f in supabase-schema.sql supabase-apnahire-upgrade.sql supabase-security-hardening.sql \
         supabase-marketplace-flows.sql supabase-fix-rls-recursion.sql supabase-payment-checkout.sql \
         supabase-employer-driver-doc-access.sql supabase-homepage-public-stats.sql supabase-admin-live-fix.sql \
         supabase-pan-india-locations.sql supabase-radius-search.sql supabase-profile-sync-rls-fix.sql; do
  apply "$ROOT/$f"
done
[ "${1:-}" = "--missing-grants" ] && apply "$HERE/01_simulate_missing_grants.sql"
apply "$ROOT/supabase-live-repair-2026-10.sql"
apply "$ROOT/supabase-signup-fix-2026-10.sql"
apply "$ROOT/supabase-notification-wording-2026-10.sql"

# Exit status: 0 only when every business-flow check passed, the test script
# itself raised no SQL error, and the health check has no FAIL row.
status=0
echo "--- business flows"
flows=$("$PSQL" -d "$DB" -f "$HERE/business_flows.sql" 2>&1)
echo "$flows" | grep -E '^(FAIL|TOTAL)'
if echo "$flows" | grep -q 'ERROR:'; then
  echo "FAIL test script errors:"; echo "$flows" | grep 'ERROR:' | head -5; status=1
fi
echo "$flows" | grep -qE '^TOTAL [0-9]+  PASS [0-9]+  FAIL 0$' || status=1
echo "--- health check on the resulting data (expect no FAIL)"
if ! health=$("$PSQL" -d "$DB" -tA -F ' | ' -f "$ROOT/supabase-db-health-check.sql" 2>&1); then
  echo "FAIL health check did not run:"; echo "$health" | head -5; status=1
fi
echo "$health" | grep -E '^(FAIL|WARN)' || echo "no FAIL/WARN rows"
echo "$health" | grep -qE '^FAIL' && status=1
[ "$status" -eq 0 ] && echo "ALL PASSED" || echo "FAILED"
exit "$status"
