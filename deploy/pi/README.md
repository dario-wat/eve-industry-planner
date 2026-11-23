# MySQL on a Raspberry Pi

The app database runs as MySQL 8.4 in Docker on a 4 GB Pi.

- **Phase 1 (current):** database on the Pi, backend on the dev PC.
- **Phase 2:** backend on the Pi too.

The server reads all DB settings from the repo-root `.env`, so no code changes are needed.

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
cp .env.example .env        # fill in passwords; set MYSQL_DATA_DIR to the SSD path
docker compose up -d
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

## Phase 2: backend on the Pi

- Install Node 26 on the Pi. Run `npm run server-build`, then `npm run server-prod`. Use a systemd unit, or add a `server` service to `docker-compose.yml`.
- In the repo-root `.env` on the Pi, set `DATABASE_HOST=127.0.0.1`.
- Limit Node's heap with `NODE_OPTIONS=--max-old-space-size=512`.
- Schedule `sync-market-history` and `sync-region-market-orders` with cron or systemd timers.
- If you no longer need DB access from the PC, set `MYSQL_BIND=127.0.0.1` in `deploy/pi/.env` and run `docker compose up -d`.

Rough RAM use on 4 GB: OS ~150 MB, Docker ~80 MB, MySQL ~1.3 GB, Node ~300-500 MB.

## Notes

- There are no automated backups.
- `my.cnf` uses `innodb_flush_log_at_trx_commit=2` to reduce disk writes. A power cut can lose about the last second of writes. Set it to `1` for full durability.
- The query-mysql skill needs `--allow-remote` while `DATABASE_HOST` points at the Pi.
