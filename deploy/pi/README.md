# MySQL on a Raspberry Pi

Moves the app database from TiDB Cloud to MySQL 8.4 in Docker on a 4 GB Pi.

- **Phase 1:** database on the Pi, backend on the dev PC.
- **Phase 2:** backend on the Pi too.

The server reads all DB settings from the repo-root `.env`, so no code changes are needed.

## 0. Prepare the Pi

1. Install **Raspberry Pi OS Lite (64-bit)**. The `mysql:8.4` image is arm64 only.
2. Prefer a USB SSD for MySQL data and backups. Mount it, e.g. at `/mnt/ssd`, and add it to `/etc/fstab`.
3. Keep swap off the SD card. Put the swap file on the SSD or use `zram-tools`.
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

Keep the old TiDB values commented out so you can switch back.

1. `npm run server-dev` once. `sequelize.sync` creates all tables. Then stop the server.
2. `npm run load-sde` loads the SDE from the local `sde/` folder.

## 3. Copy the data from TiDB

On the Pi:

```sh
cp tidb.env.example tidb.env   # TiDB host/user/password/db from the cluster's "Connect" page
./migrate-from-tidb.sh                # app data only
# or
./migrate-from-tidb.sh --with-market  # also market history / order book
```

The script dumps the data only (no schema) from TiDB, empties the matching tables on the Pi, imports the data, and compares row counts. Sessions are not copied, so you will have to log in again.

Then start `npm run server-dev` on the PC, log in, and check that your plans, wallet and jobs are there. Delete `tidb.env` and `migration/`. Keep the TiDB cluster for a week or two as a fallback.

## 4. Backups

```sh
crontab -e
# 0 4 * * * /home/<user>/eve-industry-planner/deploy/pi/backup.sh >> /home/<user>/eve-industry-planner/deploy/pi/backups/backup.log 2>&1
```

Every so often, copy `backups/` off the Pi (e.g. `scp` to the PC).

To restore:

```sh
source .env
gunzip -c backups/<file>.sql.gz | docker exec -i -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" eip-mysql mysql -uroot "$MYSQL_DATABASE"
```

## Phase 2: backend on the Pi

- Clone the repo on the Pi and install Node 26. Run `npm run server-build`, then `npm run server-prod`. Use a systemd unit, or add a `server` service to `docker-compose.yml`.
- In the repo-root `.env` on the Pi, set `DATABASE_HOST=127.0.0.1`.
- Limit Node's heap with `NODE_OPTIONS=--max-old-space-size=512`.
- Schedule `sync-market-history` and `sync-region-market-orders` with cron or systemd timers.
- If you no longer need DB access from the PC, set `MYSQL_BIND=127.0.0.1` in `deploy/pi/.env` and run `docker compose up -d`.

Rough RAM use on 4 GB: OS ~150 MB, Docker ~80 MB, MySQL ~1.3 GB, Node ~300-500 MB.

## Notes

- `my.cnf` uses `innodb_flush_log_at_trx_commit=2` to reduce disk writes. A power cut can lose about the last second of writes. Set it to `1` for full durability.
- The query-mysql skill needs `--allow-remote` while `DATABASE_HOST` points at the Pi.
