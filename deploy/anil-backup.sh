#!/usr/bin/env bash
# Nightly Anil Gold backups: Postgres + media + MongoDB
# Install: copy to /usr/local/sbin/anil-backup.sh && chmod +x
# Cron:    15 2 * * * root /usr/local/sbin/anil-backup.sh >> /var/log/anil-backup.log 2>&1

set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/anil}"
KEEP_DAYS="${KEEP_DAYS:-14}"
APP_DIR="${APP_DIR:-/var/www/anil}"
ENV_FILE="${ENV_FILE:-$APP_DIR/backend/.env}"
MEDIA_DIR="${MEDIA_DIR:-$APP_DIR/backend/media}"
MONGO_CONTAINER="${MONGO_CONTAINER:-cp-fetcher-mongo}"
MONGO_DB_NAME="${MONGO_DB_NAME:-anil_gold}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
DEST="$BACKUP_ROOT/$STAMP"

mkdir -p "$DEST"/{pg,media,mongo}
chmod 700 "$BACKUP_ROOT" "$DEST"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  # Only load simple KEY=VALUE lines
  while IFS= read -r line; do
    [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue
    export "$line"
  done < "$ENV_FILE"
  set +a
fi

MONGO_DB_NAME="${MONGODB_NAME:-$MONGO_DB_NAME}"

echo "[$(date -u +%FT%TZ)] backup start → $DEST"

# ── Postgres ───────────────────────────────────────────────────────────────
if [[ -n "${DATABASE_URL:-}" ]]; then
  # postgres://user:pass@host:port/db
  PGURL="$DATABASE_URL"
  pg_dump --no-owner --format=custom --file="$DEST/pg/anil_gold.dump" "$PGURL"
  echo "  pg_dump ok ($(du -h "$DEST/pg/anil_gold.dump" | awk '{print $1}'))"
else
  echo "  WARN: DATABASE_URL missing — skipped Postgres"
fi

# ── Media ──────────────────────────────────────────────────────────────────
if [[ -d "$MEDIA_DIR" ]]; then
  tar -C "$(dirname "$MEDIA_DIR")" -czf "$DEST/media/media.tar.gz" "$(basename "$MEDIA_DIR")"
  echo "  media ok ($(du -h "$DEST/media/media.tar.gz" | awk '{print $1}'))"
else
  echo "  WARN: media dir missing — skipped"
fi

# ── MongoDB (docker) ───────────────────────────────────────────────────────
if docker ps --format '{{.Names}}' | grep -qx "$MONGO_CONTAINER"; then
  docker exec "$MONGO_CONTAINER" mongodump --db "$MONGO_DB_NAME" --archive=/tmp/anil_mongo.archive --gzip
  docker cp "$MONGO_CONTAINER:/tmp/anil_mongo.archive" "$DEST/mongo/${MONGO_DB_NAME}.archive.gz"
  docker exec "$MONGO_CONTAINER" rm -f /tmp/anil_mongo.archive || true
  echo "  mongo ok ($(du -h "$DEST/mongo/${MONGO_DB_NAME}.archive.gz" | awk '{print $1}'))"
else
  echo "  WARN: mongo container '$MONGO_CONTAINER' not running — skipped"
fi

# ── Retention ──────────────────────────────────────────────────────────────
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +
echo "[$(date -u +%FT%TZ)] backup done; keeping ${KEEP_DAYS}d"
