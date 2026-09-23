#!/usr/bin/env bash
# BoliBazzar production control script.
#
#   ./scripts/prod.sh preflight   check the config without changing anything
#   ./scripts/prod.sh up          build, start, verify
#   ./scripts/prod.sh deploy      rebuild and roll out with no downtime
#   ./scripts/prod.sh backup      take a backup right now
#   ./scripts/prod.sh restore F   restore from a backup archive
#   ./scripts/prod.sh logs        follow logs
#   ./scripts/prod.sh status      health and resource usage
#   ./scripts/prod.sh down        stop everything (data is preserved)
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=.env.prod
COMPOSE_FILE=docker-compose.prod.yml
dc() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
warn()  { printf '\033[33m%s\033[0m\n' "$*"; }

[ -f "$ENV_FILE" ] || { red "Missing $ENV_FILE — copy .env.prod.example and fill it in."; exit 1; }
# Parse KEY=VALUE without sourcing: a value containing shell metacharacters
# (MAIL_FROM holds angle brackets) must never be interpreted as code.
while IFS= read -r line; do
  case "$line" in ''|'#'*) continue ;; esac
  key=${line%%=*}
  case "$key" in *[!A-Za-z0-9_]*) continue ;; esac
  value=${line#*=}
  # Strip one layer of surrounding quotes, as Compose does.
  case "$value" in
    \"*\") value=${value#\"}; value=${value%\"} ;;
    \'*\') value=${value#\'}; value=${value%\'} ;;
  esac
  export "$key=$value"
done < "$ENV_FILE"

# Refuse to start with a configuration that cannot serve real users.
preflight() {
  local fail=0
  echo "==> Pre-flight checks"

  required="APP_DOMAIN LANDING_DOMAIN ADMIN_DOMAIN ACME_EMAIL DB_NAME \
MONGO_ROOT_USER MONGO_ROOT_PASSWORD MONGO_APP_USER MONGO_APP_PASSWORD \
SESSION_SECRET ADMIN_EMAILS ADMIN_ACCESS_KEY \
SMTP_HOST SMTP_USER SMTP_PASS MAIL_FROM \
RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET"
  for key in $required; do
    if [ -z "$(eval "printf '%s' \"\${$key:-}\"")" ]; then
      red "  missing: $key"; fail=1
    fi
  done

  # Secrets must be long enough to be worth anything.
  for key in SESSION_SECRET ADMIN_ACCESS_KEY MONGO_APP_PASSWORD MONGO_ROOT_PASSWORD; do
    val="$(eval "printf '%s' \"\${$key:-}\"")"
    if [ -n "$val" ] && [ "${#val}" -lt 24 ]; then
      red "  $key is only ${#val} characters — use at least 32 (openssl rand -hex 32)"; fail=1
    fi
  done

  # Guard against shipping UAT/test values to production.
  case "${RAZORPAY_KEY_ID:-}" in
    rzp_test_*) red "  RAZORPAY_KEY_ID is a TEST key — real payments will not work"; fail=1 ;;
  esac
  if [ "${DEMO_BIDDERS:-false}" = "true" ]; then
    red "  DEMO_BIDDERS=true — seeded demo accounts would bid against real buyers"; fail=1
  fi
  if grep -qE '^(OTP_DEV_MODE|PAYMENTS_TEST_MODE)=true' "$ENV_FILE" 2>/dev/null; then
    warn "  OTP_DEV_MODE/PAYMENTS_TEST_MODE are set but ignored: APP_ENV=production overrides them"
  fi

  if [ "$fail" -eq 0 ]; then green "  all checks passed"; else
    red "==> Pre-flight FAILED. Fix the above before deploying."; exit 1
  fi
}

wait_healthy() {
  echo "==> Waiting for the API to report healthy"
  for _ in $(seq 1 60); do
    if [ "$(docker inspect --format '{{.State.Health.Status}}' bolibazzar-api-1 2>/dev/null)" = "healthy" ]; then
      green "    healthy"; return 0
    fi
    sleep 5
  done
  red "    API did not become healthy. Recent logs:"; dc logs --tail=50 api; return 1
}

case "${1:-status}" in
  preflight) preflight ;;

  up)
    preflight
    echo "==> Building images"
    dc build
    echo "==> Starting"
    dc up -d
    wait_healthy
    "$0" status
    ;;

  deploy)
    preflight
    echo "==> Building images"
    dc build
    # Recreate app containers one at a time; Caddy keeps serving throughout.
    for svc in api admin landing; do
      echo "==> Rolling $svc"
      dc up -d --no-deps "$svc"
      sleep 5
    done
    wait_healthy
    green "==> Deployed"
    ;;

  backup)
    dc exec -T backup /usr/local/bin/backup.sh
    echo "Archives:"; dc exec -T backup ls -lh /backups
    ;;

  restore)
    [ $# -ge 2 ] || { red "usage: $0 restore <archive-name-in-/backups>"; exit 1; }
    warn "This OVERWRITES the live database with $2."
    printf 'Type the database name (%s) to confirm: ' "$DB_NAME"; read -r reply
    [ "$reply" = "$DB_NAME" ] || { red "Cancelled."; exit 1; }
    dc exec -T backup mongorestore --uri="mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@mongo:27017/?authSource=admin" \
      --archive="/backups/$2" --gzip --drop
    green "Restored from $2"
    ;;

  logs)   dc logs -f --tail=100 ;;
  down)   dc down ;;

  status)
    echo
    echo "  BoliBazzar production"
    echo "  ---------------------------------------------------------------"
    printf "  %-16s https://%s\n" "Customer app" "$APP_DOMAIN"
    printf "  %-16s https://%s\n" "Landing"      "$LANDING_DOMAIN"
    printf "  %-16s https://%s\n" "Admin"        "$ADMIN_DOMAIN"
    echo "  ---------------------------------------------------------------"
    dc ps
    echo
    docker stats --no-stream --format '  {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' 2>/dev/null | grep bolibazzar || true
    ;;

  *) red "usage: $0 {preflight|up|deploy|backup|restore|logs|status|down}"; exit 1 ;;
esac
