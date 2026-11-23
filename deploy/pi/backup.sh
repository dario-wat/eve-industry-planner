#!/usr/bin/env bash
# Full logical backup of the Pi MySQL, gzipped, with retention.
# Cron (daily 04:00):  0 4 * * * /path/to/repo/deploy/pi/backup.sh >> /path/to/repo/deploy/pi/backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")"

set -a
source ./.env
set +a

BACKUP_DIR=${BACKUP_DIR:-./backups}
KEEP_DAYS=${BACKUP_KEEP_DAYS:-14}
mkdir -p "$BACKUP_DIR"

out="$BACKUP_DIR/$MYSQL_DATABASE-$(date +%Y%m%d-%H%M%S).sql.gz"
docker exec -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" eip-mysql \
  mysqldump -uroot --single-transaction --no-tablespaces --hex-blob \
  --default-character-set=utf8mb4 "$MYSQL_DATABASE" \
  | gzip > "$out.tmp"
mv "$out.tmp" "$out"

find "$BACKUP_DIR" -name "$MYSQL_DATABASE-*.sql.gz" -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) backup ok: $out ($(du -h "$out" | cut -f1))"
