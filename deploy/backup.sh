#!/usr/bin/env sh
# Nightly mongodump into /backups, keeping the last RETENTION_DAYS archives.
set -eu
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="/backups/bolibazzar-${STAMP}.archive.gz"

echo "[backup] starting ${STAMP}"
mongodump --uri="${MONGO_URL}" --archive="${OUT}" --gzip --quiet
echo "[backup] wrote ${OUT} ($(du -h "${OUT}" | cut -f1))"

# Prune old archives.
find /backups -name 'bolibazzar-*.archive.gz' -mtime "+${RETENTION_DAYS}" -print -delete
echo "[backup] done. retained: $(ls -1 /backups/bolibazzar-*.archive.gz 2>/dev/null | wc -l) archive(s)"
