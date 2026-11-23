# EVE Industry Planner

Personal EVE Online industry and trading tool. It reads character data from ESI (assets, industry jobs, contracts, wallet, market orders), keeps static game data (SDE) in MySQL, and builds production plans and market views on top.

Node `>=26` (`.nvmrc` / `.node-version`). TypeScript everywhere. Windows dev machine. The database is MySQL 8.4 in Docker on a Raspberry Pi on the LAN (`deploy/pi/`); the repo-root `.env` points at it.

**Never commit or push.** The user reviews every change and commits it themselves. When work needs code on the Pi or GitHub, stop and say what is ready for review.

**Comments: less is more.** Add a code comment only for something the code cannot say: a non-obvious reason, a gotcha, an external quirk. No comments that restate the code, label sections, or describe the change you just made. When in doubt, leave it out.

## Layout

| Path | What it is |
| --- | --- |
| `client/` | CRA React 18 app (MUI 5 + MUI X DataGrid, Recoil, axios-hooks, ECharts). Router basename `/eve-industry-planner` (matches GitHub Pages). API base URL is hard-coded in `client/src/index.tsx` (`http://localhost:8080`). |
| `server/` | Express + TypeDI + Sequelize (MySQL), CommonJS, run with ts-node (no build step). |
| `shared/` | `@internal/shared`: API response types (`src/api.ts`) plus small helpers (`util.ts`, `date.ts`). Compiled to `shared/dist`. |
| `libs/eve-esi/` | Local ESM-only library `eve-esi`: EVE SSO, token refresh, and every ESI endpoint the app uses. Stores nothing itself. Compiled to `libs/eve-esi/dist`. |
| `docs/` | Design notes (`market.md`: the market catalog → tradeable → candidates plan). |
| `.cursor/rules/` | Agent rules (mirrored in this file). |
| `.claude/skills/query-mysql/` | Read-only MySQL query skill (Cursor loads `.claude/skills` too). |
| `sde/` | Gitignored. Raw SDE YAML files read by `npm run load-sde`. |
| `server/dist/` | Gitignored, stale leftovers (old lambda code). Ignore it. |

## Commands

From the repo root:

- `npm run server-dev`: builds `shared`, then nodemon on `server/src/server.ts` (watches `server/src`).
- `npm run client`: builds `shared`, then CRA dev server. **Agents do not run this** (see Client).
- `npm run server-build`: first-time setup (shared, `eve-esi`, server deps).
- `npm run shared-build`: rebuild `shared/dist` after editing `shared/src`. The client and server import the built output, not the source.
- `npm run eve-esi-build`: rebuild `libs/eve-esi/dist` after editing `libs/eve-esi/src`.
- `npm run load-sde`: load SDE YAML from `sde/` into the `sde_*` tables (`SDE_LOAD_QUIET=1` to silence).
- `npm run sync-market-history -- [--region <id>] [--type-ids 34,44992 | --candidates]`: ESI market history → `esi_market_history_daily`, then rebuilds `derived_market_history_summary` (default region The Forge, default all tradeable types). `--candidates` limits it to candidates (see `docs/market.md`).
- `npm run sync-region-market-orders`: snapshot regional orders and diff into the order book tables.
- `run.ps1`: starts the local MySQL80 service (a leftover from before the Pi move), then server and client (for the user, not agents).

### Verifying changes

There are no automated tests. Check work with:

- `cd server && npx tsc --noEmit -p .` (clean today)
- `cd client && npx tsc --noEmit -p .` (clean today)
- `cd server && npm run lint` / `cd shared && npm run lint`. Server lint currently has 2 known errors in `ScheduledJobsService.ts` (unused imports kept for the commented-out jobs). Don't add more.

Rebuild `shared` / `eve-esi` first if you changed them, or the type-check sees the old `dist`.

## Architecture

### Request flow

`server/src/server.ts`: `initDatabase()` → `sequelize.sync({ alter: true })` → `EveSdeData.init()` (all SDE loaded into memory, stored in the TypeDI container) → session (`connect-session-sequelize`, stored in MySQL) → CORS for `CLIENT_DOMAIN` → `Controllers.init(app)` → `ScheduledJobsService.init()` (all jobs currently commented out).

`server/src/loaders/Controllers.ts`:

1. `actorContextMiddleware` puts `new ActorContext(req.session.accountId)` on `res.locals.actorContext`.
2. `EveLoginController` and `HealthController` are mounted.
3. `loggedOutMiddleware`: every route after this returns `null` (HTTP 200) when there is no session. The client must handle `null` data.
4. All other controllers.

Routes are flat snake_case paths with no `/api` prefix (e.g. `/planned_products`, `/production_plan/:group`).

### Accounts and characters

An `Account` (`app_accounts`) links one or more `EsiCharacter`s. SSO login (`/login_url` → `/sso_callback`, state checked against `req.session.ssoStates`) saves tokens via `EsiTokenStore.genxSaveLogin` and links the character to the current account. `ActorContext` exposes `genAccount`, `genLinkedCharacters`, `genLoggedInLinkedCharacters` (characters with a usable token), and `genMainCharacter`. Most per-user data is fetched across all logged-in characters with the helpers in `server/src/lib/eveUtil.ts`:

- `genQueryPerCharacter`, `genQueryResultPerCharacter`, `genQueryFlatPerCharacter`, `genQueryFlatResultPerCharacter`
- `genQueryResultIfAvailable`: first non-null result (e.g. a private structure only one character can see)
- `genNullOnEsiError`: turns ESI HTTP errors (403/404) into `null`; everything else still throws

### ESI

- `libs/eve-esi` owns HTTP, paging, SSO, and token refresh. Types are `Esi*` and exported from the library.
- `server/src/core/esi/EsiClientService.ts` builds the single `EsiClient` and wires `tokens.load` / `save` / `onRefreshRejected` to `EsiTokenStore` (MySQL `esi_tokens`). Without `ESI_CLIENT_ID` / `ESI_SECRET` / `ESI_CALLBACK_URI` it still works for public endpoints, which is what the scripts use.
- `EsiQueryService`: one `genx*` method per library call, all throwing. Paged endpoints: `genxX(page)` and `genxAllX`.
- `EveQueryService` / `StationService`: composed queries (name lookup chunked to 1000 unique IDs, station/structure resolution).
- Required SSO scopes: `server/src/const/EveScopes.ts`.

To add an ESI endpoint: add the method and types to `libs/eve-esi/src` (`EsiClient.ts`, `types.ts`, export from `index.ts`), run `npm run eve-esi-build`, add a `genx*` wrapper to `EsiQueryService`, then use it from a feature service.

### SDE

`EveSdeData` (`server/src/core/sde/EveSdeData.ts`) is an in-memory snapshot built at startup: `types`, `typeByName`, `groups`, `categories`, `stations`, `solarSystems`, `blueprints`, and manufacturing/reaction material and product maps, plus lookups like `categoryIdFromTypeId`, `regionIdFromStationId`, `productBlueprintFromTypeId`. Inject it and read from it. Don't query `sde_*` tables per request. IDs worth reusing live in `server/src/const/` (`IDs.ts`, `Categories.ts`, `IndustryActivity.ts`, `MetaGroups.ts`).

### Database

- There are no migrations. `sequelize.sync({ alter: true })` runs on every server start, so editing a model changes the live table the next time the server starts. Be deliberate with column renames and drops: `alter` will drop data.
- Table prefixes: `sde_*` (static data), `esi_*` (raw ESI data and tokens), `app_*` (user-created data), `derived_*` (computed from other tables). Set `tableName` explicitly and follow the prefix.
- Sessions live in the table that `connect-session-sequelize` creates.
- Scheduled job scripts never call `sync()`; the server owns the schema. Wrap the job body in `genxRunJob(name, fn)` (`server/src/core/job/runJob.ts`), which records status, error, summary, elapsed time, and peak memory in `app_job_runs`. `fn` returns the summary object; throw `JobFailure` to fail with a partial summary.
- `load-sde` uses `initDatabaseForSdeScript()` and `sync({ force: true })`, which drops and recreates the SDE tables. Never point it at `initDatabase()`: every app table would be dropped.
- To inspect data, use the read-only skill: `node .claude/skills/query-mysql/scripts/query.cjs --tables | --describe <t> | --stdin <<'SQL' ... SQL`. Read `.claude/skills/query-mysql/SKILL.md` first. SELECT only, never print tokens or `.env`.

## Server conventions

Feature folders: `server/src/features/<snake_name>/` with `<Model>.ts`, `<Model>Assocs.ts`, `<Name>Service.ts`, `<Name>Controller.ts`. Shared infrastructure lives in `server/src/core/`. `planned_product/` is a small, complete example.

- **Models**: `class X extends Model` with `declare` fields, plus an exported `xModelDefine(sequelize)` that calls `X.init(...)`. Associations go in `xAssocsDefine()`. Register both in `server/src/loaders/initDatabase.ts` (`initDatabase()` only, not the SDE function).
- **Controllers**: extend `core/controller/Controller.ts`, `@Service()`, constructor injection, routes in `initController()` via `appGet` / `appPost` / `appDelete` (handler gets `(req, res, actorContext)`). Add the controller to the constructor and `init` in `server/src/loaders/Controllers.ts`, after `loggedOutMiddleware` unless it must work logged out. The wrappers don't catch errors, so a thrown error leaves the request hanging. Validate input or catch where a failure is expected.
- **Services**: `@Service()`, inject other services and `EveSdeData` through the constructor. Pass `ActorContext` in and never read the session in a service. Return types are the `*Res` types from `@internal/shared`.
- **Naming**: async methods that do I/O (DB, ESI, files, HTTP) are `gen*` (may return null / catch-and-null) or `genx*` (throws / non-null). Pure or in-memory helpers never get the `gen` prefix (`resolveTypeIds`, `parseContent`). Match the naming of neighbouring methods.
- **Imports**: server uses relative imports. Libraries: `underscore` and `lodash` are both used (match the file), plus `date-fns`, `mathjs`, and `memoizee` for memoizing.
- **Style** (`eslint.base.cjs`): 100-char lines, single quotes, `===`, unused vars/args must start with `_`, `as` assertions only, no object-literal assertions.
- **Secrets**: they stay in `.env` (keys: `SERVER_PORT`, `SESSION_SECRET`, `ESI_*`, `CLIENT_DOMAIN`, `DATABASE_*`, `DATABASE_READONLY_*`, `USE_HTTPS_LOCAL`). Never print, invent, or commit them. Don't change the ESI `USER_AGENT` contact string.

## Shared types

All request/response DTOs live in `shared/src/api.ts` (`Eve*Res`, `*Res`), exported through `shared/src/index.ts`. Don't declare DTO types in `client/` or `server/`. After editing, run `npm run shared-build`. `filterNullOrUndef` and date helpers in `shared` are used on both sides.

## Client conventions

- Functional components and hooks only. MUI for UI (`DataGrid` for tables, `EChart` wrapper in `components/util/EChart.tsx` for charts). Theme and dark mode: `client/src/theme/`.
- Imports are absolute from `src` (`components/util/WorkspacePage`, `contexts/UserContext`).
- Data fetching: `useAxios<SomeRes>('/route')` from `axios-hooks`, typed with `@internal/shared`. Plain `axios` for mutations and imperative fetches. Cookies are sent (`withCredentials`).
- State: `UserContext` (from `/logged_in_user`) for login, Recoil atoms for cross-page state (`client/src/recoil/`, or a per-page store like `market_transactions/marketTransactionsStore.ts`). Atom keys must be globally unique.
- Pages: add a component under `client/src/components/<area>/`, wrap it in `WorkspacePage` / `WorkspaceFill` / `WorkspaceSpinner`, and register it in the `routes` array in `components/homepage/HomePage.tsx` (path, label, icon), which also drives the nav drawer.
- Item icons and names: `EveIcon`, `EveIconAndName`, and `ItemAutocomplete` in `components/util/`.
- **Do not start the frontend dev server (`npm run client`, `run.ps1`) and do not open a browser to check UI, layout, routing, or client state.** The user runs and checks the client. Verify with `npx tsc --noEmit` in `client/`.

## Do not

- Put API DTO types anywhere except `shared/`.
- Call ESI or load SDE from the client.
- Make ad-hoc ESI HTTP calls on the server. Go through `eve-esi` → `EsiQueryService`.
- Edit `libs/eve-esi/dist/` or `shared/dist/` by hand.
- Widen SDE loading to `initDatabase()`, or use `sync({ force: true })` outside the SDE script.
- Write to MySQL from agent tooling, or connect with the app's `DATABASE_USERNAME` for ad-hoc queries.
- Commit `.env`, `localhost.key/.crt/.csr`, or `sde/`.
