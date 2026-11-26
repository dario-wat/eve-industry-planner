#!/bin/sh
# Runs one scheduled job in a one-off container. Started by systemd/eip-job@.service.
set -eu
cd "$(dirname "$0")"

job="${1:-}"
case "$job" in
  order-book) set -- node dist/scripts/syncRegionMarketOrders.js ;;
  history-all) set -- node dist/scripts/syncMarketHistory.js ;;
  history-candidates) set -- node dist/scripts/syncMarketHistory.js --candidates ;;
  net-worth) set -- node dist/scripts/snapshotNetWorth.js ;;
  *)
    echo "usage: $0 order-book|history-all|history-candidates|net-worth" >&2
    exit 2
    ;;
esac

# The fixed name stops a second copy of the same job from starting.
exec docker compose run --rm -T --name "eip-job-$job" jobs "$@"
