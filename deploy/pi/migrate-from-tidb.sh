#!/usr/bin/env bash
# Copy app data from TiDB Cloud into the Pi's MySQL (data only).
#
# Run on the Pi, after:
#   1. `docker compose up -d` (MySQL is running)
#   2. the server has started once against the Pi DB (it creates the tables)
#   3. `npm run load-sde` against the Pi DB (SDE is reloaded, not copied)
# Stop the server while this runs.
#
# Usage: ./migrate-from-tidb.sh [--with-market] [--yes]
#   --with-market  also copy market history / order book tables (can be large;
#                  otherwise re-sync them with the sync-* scripts)
#   --yes          skip the confirmation prompt
set -euo pipefail
cd "$(dirname "$0")"

set -a
source ./.env
source ./tidb.env
set +a

: "${TIDB_HOST:?set in tidb.env}" "${TIDB_PORT:?}" "${TIDB_USER:?}" "${TIDB_PASSWORD:?}" "${TIDB_DATABASE:?}"
: "${MYSQL_ROOT_PASSWORD:?set in .env}" "${MYSQL_DATABASE:?}"

APP_TABLES=(
  app_accounts
  esi_accounts
  esi_characters
  esi_tokens
  app_planned_products
  app_material_stations
  esi_wallet_transactions
  esi_wallet_journal
  esi_industry_jobs
)
MARKET_TABLES=(
  esi_market_history_daily
  derived_market_history_summary
  esi_market_order_open
  derived_market_order_event
)

with_market=0
yes=0
for arg in "$@"; do
  case "$arg" in
    --with-market) with_market=1 ;;
    --yes|-y) yes=1 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

TABLES=("${APP_TABLES[@]}")
if [ "$with_market" = 1 ]; then TABLES+=("${MARKET_TABLES[@]}"); fi

IMAGE=mysql:8.4
CONTAINER=eip-mysql

# Run a MySQL client program against TiDB (from a throwaway container).
tidb_run() {
  local prog=$1; shift
  docker run --rm -e MYSQL_PWD="$TIDB_PASSWORD" "$IMAGE" "$prog" \
    -h"$TIDB_HOST" -P"$TIDB_PORT" -u"$TIDB_USER" --ssl-mode=REQUIRED "$@"
}

# Run a MySQL client program against the Pi's MySQL container.
pi_run() {
  local prog=$1; shift
  docker exec -i -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" "$CONTAINER" "$prog" -uroot "$@"
}

count_sql() {
  local sql="" t
  for t in "${TABLES[@]}"; do
    [ -n "$sql" ] && sql+=" UNION ALL "
    sql+="SELECT '$t', COUNT(*) FROM \`$t\`"
  done
  echo "$sql"
}

echo "Checking Pi MySQL..."
for t in "${TABLES[@]}"; do
  exists=$(pi_run mysql -N -e \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$MYSQL_DATABASE' AND table_name='$t'")
  if [ "$exists" != 1 ]; then
    echo "Table $t does not exist on the Pi. Start the server once against the Pi DB first." >&2
    exit 1
  fi
done

echo "Tables to copy (${#TABLES[@]}): ${TABLES[*]}"
if [ "$yes" != 1 ]; then
  read -r -p "This EMPTIES these tables on the Pi and refills them from TiDB. Continue? [y/N] " ans
  [ "$ans" = y ] || [ "$ans" = Y ] || { echo "Aborted."; exit 1; }
fi

mkdir -p migration
DUMP="migration/tidb-$(date +%Y%m%d-%H%M%S).sql"
echo "Dumping from TiDB to $DUMP ..."
# No --single-transaction: mysqldump uses savepoints with it, which TiDB
# rejects ("SAVEPOINT sp does not exist"). Nothing should write to TiDB during
# the migration, so per-table reads are consistent enough.
tidb_run mysqldump \
  --no-create-info --complete-insert --skip-triggers \
  --skip-lock-tables --no-tablespaces \
  --set-gtid-purged=OFF --column-statistics=0 \
  --hex-blob --default-character-set=utf8mb4 \
  "$TIDB_DATABASE" "${TABLES[@]}" > "$DUMP"
echo "Dump size: $(du -h "$DUMP" | cut -f1)"

echo "Importing into Pi MySQL ($MYSQL_DATABASE)..."
{
  echo "SET FOREIGN_KEY_CHECKS=0;"
  for t in "${TABLES[@]}"; do echo "DELETE FROM \`$t\`;"; done
  cat "$DUMP"
  echo "SET FOREIGN_KEY_CHECKS=1;"
} | pi_run mysql --default-character-set=utf8mb4 "$MYSQL_DATABASE"

echo "Comparing row counts..."
SQL=$(count_sql)
tidb_counts=$(tidb_run mysql -N -e "$SQL" "$TIDB_DATABASE")
pi_counts=$(pi_run mysql -N -e "$SQL" "$MYSQL_DATABASE")

mismatch=0
printf '%-34s %12s %12s\n' TABLE TIDB PI
while read -r t n; do
  p=$(awk -v t="$t" '$1 == t { print $2 }' <<<"$pi_counts")
  flag=""
  if [ "$n" != "$p" ]; then flag="  <-- MISMATCH"; mismatch=1; fi
  printf '%-34s %12s %12s%s\n' "$t" "$n" "$p" "$flag"
done <<<"$tidb_counts"

if [ "$mismatch" = 1 ]; then
  echo "Row counts differ. Keep using TiDB until this is resolved." >&2
  exit 1
fi
echo "Done. Dump kept at $DUMP (delete it once you're happy)."
