# EVE Industry Planner on a Raspberry Pi

MySQL 8.4, the API server, and the scheduled jobs run in Docker on a 4 GB Pi.

- **Phase 1:** database on the Pi, backend on the dev PC.
- **Phase 2 (in progress):** backend and jobs on the Pi too. The dev PC keeps running its own server against the same database.

All Pi settings live in one git-ignored file, `deploy/pi/.env` (template: `.env.example`).

## 0. Prepare the Pi

1. Install **Raspberry Pi OS Lite (64-bit)**. The `mysql:8.4` image is arm64 only.
2. Use a USB SSD formatted as **ext4** for MySQL data (not exFAT). Mount it, e.g. at `/mnt/ssd`, and add it to `/etc/fstab` with `nofail`.
3. Keep swap off the SD card. Use zram, or a swap file on the SSD.
4. Install Docker:
   ```sh
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER   # log out and back in
   ```
   If `docker info` warns about missing memory limit support, append `cgroup_enable=memory` to the single line in `/boot/firmware/cmdline.txt` and reboot. Without it, `mem_limit` is ignored.
5. Give the Pi a fixed LAN IP (a DHCP reservation on the router). Optionally install Tailscale on the Pi and the PC for access away from home. **Never port-forward 3306.**

## 1. Start MySQL

```sh
git clone <repo> && cd eve-industry-planner/deploy/pi
cp .env.example .env        # fill in everything; set MYSQL_DATA_DIR to the SSD path
docker compose up -d mysql
docker compose ps           # wait for "healthy"
```

The first start creates the database, the app user and the read-only user. If you change the users in `.env` later, they will not be recreated. Use `ALTER USER`, or wipe the data dir to start over.

## 2. Point the backend (on the PC) at the Pi

In the repo-root `.env`:

```
DATABASE_HOST=<pi LAN or Tailscale IP>
DATABASE_PORT=3306
DATABASE_NAME=<MYSQL_DATABASE>
DATABASE_USERNAME=<MYSQL_USER>
DATABASE_PASSWORD=<MYSQL_PASSWORD>
DATABASE_SSL=0
DATABASE_READONLY_USERNAME=<MYSQL_READONLY_USER>
DATABASE_READONLY_PASSWORD=<MYSQL_READONLY_PASSWORD>
```

On an empty database:

1. Run `npm run server-dev` once. `sequelize.sync` creates all tables.
2. Run `npm run load-sde` to load the SDE from the local `sde/` folder.

## 3. Server and jobs on the Pi

One image, `eip-server`, built on the Pi from `server/Dockerfile`. Two compose services use it:

- `server`: the API on port 8080 (memory cap 768 MB).
- `jobs`: never started by `up`. Each job is a one-off container from the same image (memory cap 768 MB), so it runs whatever version is deployed and does not need `server` running.

The app's database settings come from the `MYSQL_*` values in `.env`. The app keys (`SESSION_SECRET`, `ESI_*`, `CLIENT_DOMAIN`) must be set there too. Compose refuses to start if one is missing.

```sh
docker compose build server
docker compose up -d server
docker compose ps                                   # server becomes "healthy"
docker compose run --rm jobs node dist/scripts/syncRegionMarketOrders.js
docker compose run --rm jobs node dist/scripts/syncMarketHistory.js --candidates
```

Each job run is recorded in `app_job_runs`.

### Deploying

Push to GitHub, then from the PC run `npm run deploy-pi` (or `bash deploy.sh` on the Pi). It pulls `main`, checks that every key in `.env.example` is set in `.env`, rebuilds the image, restarts the server and waits for it to become healthy, then copies the timer units and enables any new timers. Running jobs finish on the old image.

The previous image is kept as `eip-server:previous`. To roll back: `docker tag eip-server:previous eip-server:latest && docker compose up -d server`.

A deploy never restarts MySQL. If `docker-compose.yml` or `my.cnf` changed, it says so; run `docker compose up -d mysql` when convenient.

## 4. Scheduled jobs

systemd user timers run the jobs through `run-job.sh`. No sudo is needed; it relies on linger being on (`loginctl show-user $USER -p Linger`, else `sudo loginctl enable-linger $USER`).

| Timer | Job | When (UTC) |
| --- | --- | --- |
| `eip-order-book` | region order book | every 5 minutes |
| `eip-history-all` | market history, all tradeable types | 1st of the month, 11:30 |
| `eip-history-candidates` | market history, candidates only | 2nd–31st, 11:30 |
| `eip-net-worth` | net worth per logged-in character | daily, 15:00 |

The history and net worth timers catch up on a missed run after downtime. A job never overlaps itself: systemd skips a tick while the previous run is still going.

Deploys install the timers. To install them by hand:

```sh
mkdir -p ~/.config/systemd/user
cp ~/eve-industry-planner/deploy/pi/systemd/* ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now eip-order-book.timer eip-history-all.timer eip-history-candidates.timer eip-net-worth.timer
systemctl --user list-timers 'eip-*'
```

Run a job now: `systemctl --user start eip-job@history-candidates`. Logs: `journalctl --user-unit eip-job@order-book -n 50`. Stop all schedules: `systemctl --user disable --now eip-order-book.timer eip-history-all.timer eip-history-candidates.timer eip-net-worth.timer`.

The server runs against the same database as the dev PC, and both run `sequelize.sync({ alter: true })` on start. Keep model changes additive until they are deployed.

Login through the Pi server does not work yet: `ESI_CALLBACK_URI` points at the dev PC.

If you no longer need DB access from the PC, set `MYSQL_BIND=127.0.0.1` in `.env` and run `docker compose up -d`.

Rough RAM use on 4 GB: OS ~150 MB, Docker ~80 MB, MySQL ~1.3 GB, server ~100 MB (cap 768 MB), the order book job ~450 MB and history jobs ~150–200 MB (cap 768 MB each).

## Notes

- There are no automated backups.
- `my.cnf` uses `innodb_flush_log_at_trx_commit=2` to reduce disk writes. A power cut can lose about the last second of writes. Set it to `1` for full durability.
- The query-mysql skill (`.claude/skills/query-mysql`) treats LAN hosts like the Pi as allowed; only public hosts need `--allow-remote`.
