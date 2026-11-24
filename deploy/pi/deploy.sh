#!/bin/bash
# Pulls the latest main, rebuilds the image, restarts the server, and installs the job timers.
# Run on the Pi: bash ~/eve-industry-planner/deploy/pi/deploy.sh
set -euo pipefail

HEALTH_TIMEOUT_SECONDS=180
UNIT_DIR="$HOME/.config/systemd/user"

main() {
  cd "$(dirname "$0")"

  if [ -n "$(git status --porcelain)" ]; then
    echo "The checkout has local changes. Commit or discard them first:" >&2
    git status --short >&2
    exit 1
  fi

  local old new
  old=$(git rev-parse HEAD)
  git pull --ff-only --quiet
  new=$(git rev-parse HEAD)
  if [ "$old" = "$new" ]; then
    echo "Already at $(git log --oneline -1). Redeploying."
  else
    echo "New commits:"
    git log --oneline "$old..$new"
  fi

  check_env_keys

  if docker image inspect eip-server:latest > /dev/null 2>&1; then
    docker tag eip-server:latest eip-server:previous
  fi
  docker compose build server
  docker compose up -d server
  wait_healthy

  install_timers

  docker image prune -f > /dev/null

  if [ "$old" != "$new" ] \
    && ! git diff --quiet "$old" "$new" -- docker-compose.yml my.cnf initdb; then
    echo
    echo "MySQL settings changed and MySQL was not restarted."
    echo "When convenient: cd $(pwd) && docker compose up -d mysql"
  fi

  echo
  echo "Deployed $(git log --oneline -1)."
}

check_env_keys() {
  local missing=()
  local key
  for key in $(grep -oE '^[A-Z_][A-Z0-9_]*=' .env.example | tr -d '='); do
    if ! grep -qE "^${key}=.+" .env; then
      missing+=("$key")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    echo "Missing or empty in deploy/pi/.env: ${missing[*]}" >&2
    exit 1
  fi
}

wait_healthy() {
  local waited=0 status
  while :; do
    status=$(docker inspect -f '{{.State.Health.Status}}' eip-server)
    if [ "$status" = "healthy" ]; then
      echo "Server is healthy."
      return
    fi
    if [ "$waited" -ge "$HEALTH_TIMEOUT_SECONDS" ]; then
      echo "Server is $status after ${HEALTH_TIMEOUT_SECONDS}s. Logs: docker logs eip-server" >&2
      echo "Roll back: docker tag eip-server:previous eip-server:latest" \
        "&& docker compose up -d server" >&2
      exit 1
    fi
    sleep 5
    waited=$((waited + 5))
  done
}

# Timers the user disabled by hand stay disabled; only timers new to this Pi get enabled.
install_timers() {
  mkdir -p "$UNIT_DIR"
  local new_timers=()
  local unit
  for unit in systemd/*.timer; do
    if [ ! -e "$UNIT_DIR/$(basename "$unit")" ]; then
      new_timers+=("$(basename "$unit")")
    fi
  done
  cp systemd/* "$UNIT_DIR/"
  systemctl --user daemon-reload
  if [ ${#new_timers[@]} -gt 0 ]; then
    systemctl --user enable --now "${new_timers[@]}"
  fi
}

# git pull can rewrite this file mid-run; bash has already read all of main by now.
main "$@"
exit
