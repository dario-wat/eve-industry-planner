---
name: query-mysql
description: >-
  Read-only SQL against the EVE Industry Planner MySQL database (on the Raspberry Pi) using
  the SELECT-only user from repo-root .env. Use when inspecting tables or schema, running SQL,
  checking stored SDE or app data, debugging DB contents, or answering questions about types,
  blueprints, industry jobs, market history/orders, wallets, accounts, or other stored data.
  Never writes.
---

# Query MySQL (read-only)

Run from the repo root. Never use the `mysql` CLI, never connect as `DATABASE_USERNAME`, never print `.env`.

```bash
Q=.claude/skills/query-mysql/scripts/query.cjs

node $Q --tables                 # tables + approx rows/MB
node $Q --describe sde_types     # columns, indexes, FKs in and out, approx rows

# Preferred for any real SQL: quoted heredoc on stdin, no shell-quoting issues
node $Q --stdin <<'SQL'
SELECT id, name FROM sde_types WHERE name LIKE '%Tritanium%'
SQL

node $Q --sql "SELECT COUNT(*) FROM esi_industry_jobs"   # fine for trivial SQL
```

Use the Bash tool for the heredoc form (PowerShell has no `<<'SQL'`).

## Behaviour

- **Rows are capped at `--limit` (default 100) inside the SQL**: `LIMIT 101` is appended to SELECT/WITH queries without their own trailing LIMIT, so large tables are not pulled over the network. `"truncated": true` means there were more rows. `--limit 0` removes the cap; only use it with a query you know is small.
- **Timeout**: `--timeout` seconds (default 30), enforced by the server.
- **Output**: compact JSON `{db, columns, rowCount, truncated, ms, rows}` with one row array per line. Duplicate column names are kept. `--tsv` and `--objects` are alternatives.
- **Redaction**: `accessToken`, `refreshToken` (also when aliased or wrapped in a function) and `Sessions.data` show as `[redacted]`. Don't use `--include-secrets` unless the user asks, and never paste tokens into chat.
- Table names are case-sensitive on the Pi (e.g. `Sessions`).

## Safety (why writes are impossible)

1. The `DATABASE_READONLY_*` account has `GRANT SELECT` only; the script aborts if `SHOW GRANTS` shows anything more.
2. The session is `READ ONLY`.
3. The SQL must be one statement that starts with SELECT / WITH / SHOW / DESCRIBE / EXPLAIN, with no write keywords. String literals, quoted identifiers and comments are ignored by this check, so `REPLACE(...)` and `LIKE '%Set%'` work.

LAN hosts (like the Pi) are allowed. A public `DATABASE_HOST` (the TiDB fallback) needs `--allow-remote`. `--setup-readonly` only works for a local MySQL; on the Pi the user comes from `deploy/pi/initdb/10-readonly-user.sh`.

## Workflow

1. `--tables`, then `--describe` the tables you need. Don't guess column names (e.g. `sde_types.id`, not `typeId`).
2. For what a column *means*, read the Sequelize model under `server/src/`. If the model and the live DB disagree, the live DB is what you can query.
3. Summarize results; don't paste big row dumps.
