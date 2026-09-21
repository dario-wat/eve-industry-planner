---
name: query-mysql
description: >-
  Query the local EVE Industry Planner MySQL database using repo-root .env credentials.
  This must be read only, we can never do any writes absolutely ever.
  Use when inspecting tables, running SQL, checking stored SDE or app data, debugging DB contents, or answering questions about types, blueprints, industry jobs, wallets, accounts, or other MySQL data.
---

# Query MySQL

This must be read only, we can never do any writes absolutely ever.

Run SQL against this app's local MySQL. Do not invent a connection string. Do not use the `mysql` CLI. Do not connect as `DATABASE_USERNAME` (the app user, often root).

This tool is **SELECT-only**. There is no write mode. Never run DELETE, DROP, UPDATE, INSERT, or other mutations.

Do not maintain or consult a handwritten schema catalog. The live database and Sequelize models are the source of truth.

## How to query

From the repo root, **execute** (do not only read) `scripts/query.cjs`:

```bash
node .cursor/skills/query-mysql/scripts/query.cjs --tables
node .cursor/skills/query-mysql/scripts/query.cjs --describe types
node .cursor/skills/query-mysql/scripts/query.cjs --sql "SELECT id, name FROM types LIMIT 20"
```

On Windows PowerShell, if quoting breaks, write SQL to a temp file and use `--file`:

```bash
node .cursor/skills/query-mysql/scripts/query.cjs --file tmp-query.sql
```

Queries use `DATABASE_READONLY_USERNAME` / `DATABASE_READONLY_PASSWORD` in `.env` (SELECT privilege only). If those keys are missing:

```bash
node .cursor/skills/query-mysql/scripts/query.cjs --setup-readonly
```

That creates a MySQL user with `GRANT SELECT` only. Do not print the password.

If deps are missing: `npm i --prefix server`.

## Discover schema

Before writing SQL against an unfamiliar table:

1. `--tables` to list what actually exists (the DB can contain leftover tables).
2. `--describe <table>` for columns. Or query `information_schema` for joins/indexes.
3. For *intended* app schema (FKs, what a column means), read the Sequelize model under `server/src/` and the registrars in `server/src/loaders/initDatabase.ts`. Models can lag the live DB; if they disagree, trust `--describe` for what you can query.

SDE tables are loaded by `server/src/scripts/loadDataIntoMySqlScript.ts` via `initDatabaseForSdeScript()`. Do not route that through `initDatabase()`.

## Safety

- MySQL account can SELECT only. The script aborts if SHOW GRANTS is not SELECT-only, sets `TRANSACTION READ ONLY`, rejects mutating SQL, and has no `--write` flag.
- Never use the `mysql` CLI or the app `DATABASE_USERNAME` to run agent queries.
- Default `--limit 100`. Always put `LIMIT` in SELECT queries. SDE tables are large.
- `accessToken` / `refreshToken` are redacted unless `--include-secrets`. Do not print ESI tokens in chat. Do not dump `sessions.data`.
- Non-localhost `DATABASE_HOST` needs `--allow-remote`. Prefer localhost.
- Never dump `.env` or passwords.

## Workflow

1. Introspect with `--tables` / `--describe` (and models if you need meaning).
2. Write the query from that live schema. Quote reserved names (e.g. `` `group` ``).
3. Summarize results. Do not paste huge row dumps.
