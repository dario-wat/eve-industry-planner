# EVE Industry Planner

Personal EVE Online industry planner: ESI character data, static SDE, production plans, wallet/market views.

Node `>=26`. TypeScript throughout.

## Layout

- `client/` — CRA React app (MUI, Recoil, axios-hooks). Router basename is `/eve-industry-planner`. API base URL is set in `client/src/index.tsx`.
- `server/` — Express + TypeDI + Sequelize (MySQL). ESI via `eve-esi-client` and `packages/eve-sso`.
- `shared/` — `@internal/shared`. API response types live in `shared/src/index.d.ts`. Do not duplicate those types in client or server.
- `packages/eve-sso/` — local SSO package used by the server.

## Commands

From the repo root, in separate terminals:

- `npm run server-dev` — nodemon on `server/src/server.ts`
- `npm run client` — CRA on the client

Tests: `npm run server-test`, `npm run shared-test`. Client: `cd client && npm test`. Server lint: `cd server && npm run lint`.

Load SDE YAML into MySQL: `ts-node ./server/src/scripts/loadDataIntoMySqlScript.ts`. That script uses `initDatabaseForSdeScript()` and must not go through `initDatabase()` (comment there: it would drop app tables).

Local HTTPS is documented in `README.md`. Secrets stay in `.env`; never invent ESI tokens or commit credentials.

## Server conventions

Feature folders under `server/src/features/<name>/`: Sequelize model, `*Assocs.ts`, `*Service.ts`, `*Controller.ts`.

- Controllers extend `server/src/core/controller/Controller.ts`, use `@Service()`, inject via constructor, register routes with `appGet` / `appPost` / `appDelete`.
- New controllers must be constructed and `init`'d in `server/src/loaders/Controllers.ts`. Login/health skip `loggedOutMiddleware`; everything else requires a session.
- New models/assocs must be registered in `server/src/loaders/initDatabase.ts`.
- Request-scoped user is `ActorContext` (`res.locals.actorContext`). Pass it into services; do not read the session in services.
- Async methods that hit the database, ESI, or other I/O are named `gen*` (nullable / catch-and-null) and `genx*` (throwing / non-null). Do not use `gen` for pure in-memory helpers (filtering SDE data, resolving IDs from already-loaded state, etc.).
- Talk to ESI through existing query services (`EsiQueryService`, `EveQueryService`, etc.), not ad-hoc ESI HTTP. Static game data goes through `EveSdeData`.

## Client conventions

Functional components. MUI for UI. Recoil (or existing page stores) for client state. `UserContext` for login. `axios-hooks` for API calls.

Do not start the frontend server (`npm run client` or similar) and do not open the browser to test UI, layout, routing, or client-state changes. The user runs the client themselves.

## Do not

- Put API DTO types anywhere except `shared/`
- Call ESI or dump SDE from the client
- Edit `packages/eve-sso/dist/` by hand
- Widen SDE loading to `initDatabase()`
