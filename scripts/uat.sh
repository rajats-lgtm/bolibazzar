#!/usr/bin/env bash
# BoliBazzar UAT control script.
#
#   ./scripts/uat.sh up       build images, start the stack, seed, verify
#   ./scripts/uat.sh down     stop the stack (keeps the database)
#   ./scripts/uat.sh reset    stop and wipe the database
#   ./scripts/uat.sh logs     follow logs
#   ./scripts/uat.sh status   show health and URLs
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE="docker compose --env-file .env.uat -f docker-compose.uat.yml"

if [ ! -f .env.uat ]; then
  echo "Missing .env.uat. Copy .env.uat.example and fill in the secrets." >&2
  exit 1
fi
set -a; . ./.env.uat; set +a

# Images are built with --network=host: on some corporate networks Docker's
# bridge network cannot reach the package registries, and compose's
# build.network key is not honoured by BuildKit.
build_images() {
  echo "==> Building images (this takes a few minutes the first time)"
  docker build --network=host \
    --build-arg "NEXT_PUBLIC_BASE_URL=${PUBLIC_BASE_URL}" \
    --build-arg "NEXT_PUBLIC_RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID:-}" \
    -t bolibazzar/api:uat -f Dockerfile .
  docker build --network=host \
    --build-arg "ADMIN_API_ORIGIN=http://api:3000" \
    -t bolibazzar/admin:uat -f apps/admin-web/Dockerfile .
  docker build --network=host \
    --build-arg "NEXT_PUBLIC_APP_URL=${PUBLIC_BASE_URL}" \
    --build-arg "NEXT_PUBLIC_APP_STORE_URL=${APP_STORE_URL:-}" \
    --build-arg "NEXT_PUBLIC_PLAY_STORE_URL=${PLAY_STORE_URL:-}" \
    -t bolibazzar/landing:uat -f apps/desktop-landing/Dockerfile .
}

wait_healthy() {
  echo "==> Waiting for services to become healthy"
  for _ in $(seq 1 60); do
    if curl -sf -m 3 "http://localhost:${API_PORT:-3000}/api/health" >/dev/null 2>&1; then
      echo "    API is up"
      return 0
    fi
    sleep 3
  done
  echo "    API did not become healthy in time. Recent logs:" >&2
  $COMPOSE logs --tail=40 api >&2
  return 1
}

status() {
  echo
  echo "  BoliBazzar UAT"
  echo "  ---------------------------------------------------------------"
  printf "  %-18s %s\n" "Customer app"  "${PUBLIC_BASE_URL}/?app"
  printf "  %-18s %s\n" "Landing"       "${PUBLIC_BASE_URL%:*}:${LANDING_PORT:-3002}"
  printf "  %-18s %s\n" "Admin console" "${PUBLIC_BASE_URL%:*}:${ADMIN_PORT:-3001}"
  printf "  %-18s %s\n" "API health"    "${PUBLIC_BASE_URL}/api/health"
  echo
  printf "  %-18s %s\n" "Buyer login"    "buyer@test.in     (code shown on screen)"
  printf "  %-18s %s\n" "Supplier login" "supplier@test.in  (code shown on screen)"
  printf "  %-18s %s\n" "Admin login"    "${ADMIN_EMAILS} + ADMIN_ACCESS_KEY from .env.uat"
  echo "  ---------------------------------------------------------------"
  $COMPOSE ps
}

case "${1:-up}" in
  up)
    build_images
    echo "==> Starting the stack"
    $COMPOSE up -d mongo
    $COMPOSE run --rm seed
    $COMPOSE up -d api admin landing
    wait_healthy
    status
    ;;
  down)   $COMPOSE down ;;
  reset)  $COMPOSE down -v ;;
  logs)   $COMPOSE logs -f --tail=100 ;;
  status) status ;;
  *) echo "usage: $0 {up|down|reset|logs|status}" >&2; exit 1 ;;
esac
