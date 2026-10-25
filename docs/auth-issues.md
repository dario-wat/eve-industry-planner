# Auth issues

Known problems with ESI login and token handling that were left alone when the `eve-esi` library replaced `eve-sso` and `eve-esi-client`. None of these were fixed on purpose. Each one lists where it lives.

## Open issues

### "Logged in" means the access token has not expired

`EsiCharacter.isLoggedIn` returns true when any stored access token has an `expires` in the future. An access token lives about 20 minutes, so a character counts as logged out roughly 20 minutes after its last use. `ActorContext.genLoggedInLinkedCharacters` then skips it, so it never gets refreshed, even though its refresh token is still good.

Trading Lady stays usable only because the 5-minute order book Lambda keeps calling ESI as her.

What the check should mean is "has a stored refresh token that still works". The library refreshes on demand, so the expiry check is not needed.

Where: `server/src/core/esi/models/EsiCharacter.ts` (`isLoggedIn`), `server/src/core/actor_context/ActorContext.ts`, `server/src/core/account/AccountController.ts` (`tokenExpired` in the characters response).

### Fixed SSO state

The `state` sent to EVE SSO is the constant `ESI_SSO_STATE` from `.env`. The callback does not check it against anything tied to the user's session, so there is no CSRF protection on the login callback.

The fix is a random state per login attempt, stored in the session and compared in `/sso_callback`.

Where: `server/src/core/controller/EveLoginController.ts`.

### Several token rows per character

`esi_tokens` allows many rows per character. `EsiTokenStore` picks the first row whose scopes include every required scope, and `genxSaveLogin` updates a row whose scopes cover the login's scopes, or creates a new one. Changing the scope list can leave older rows behind, and which row gets used depends on row order.

One row per character, replaced on every login, would be simpler.

Where: `server/src/core/esi/models/EsiToken.ts`, `server/src/core/esi/EsiTokenStore.ts` (`genTokenWithScopes`).

### Token refresh can race across processes

The library shares one refresh per character inside a process, so concurrent calls in the server do not refresh twice. That does not help across processes. The server and a Lambda can both see an expiring token for the same character and both refresh it. This is most likely for Trading Lady, who is used by both the server and the order book Lambda.

If EVE SSO rotates refresh tokens, the process that saves last can leave the other with an older, invalid refresh token. This has not been confirmed.

Possible fixes: a row lock or compare-and-swap in `genxSaveTokenSet`, re-reading the row before refreshing, or running Trading Lady's calls in one place only.

Where: `server/src/core/esi/EsiTokenStore.ts` (`genLoadTokenSet`, `genxSaveTokenSet`), `packages/eve-esi/src/tokenManager.ts`.

### A revoked or invalid refresh token is not handled

When a refresh fails (for example a revoked token, error `invalid_grant`), the library throws `EsiSsoError` on every call. Nothing marks the token as dead, so each request retries the refresh and fails again, and the user is not told to log in again except through the expiry check above.

Where: `server/src/core/esi/EsiTokenStore.ts`, `server/src/core/esi/EsiClientService.ts`.

## Not verified yet

These need real tokens or the production database, so they have not been checked.

- **Real login and refresh.** `exchangeCode`, `refreshTokens` and `genxSaveLogin` ran against fakes and live public ESI only. Logged-in endpoints have not been run against real ESI with the new library.
- **`owner` on existing characters.** The old login code passed `ownerId`, but the column is `owner`, so characters created by the old code may have a null `owner`. The new code sets `owner` on every login and corrects existing rows. Existing rows were not inspected.
- **Lambda refresh.** The packaged Lambda has not yet been run with the new library, so token refresh from a Lambda is untested.

## Fixed by the migration

Kept here so they are not rediscovered.

- The `gen*` ESI wrappers never returned null because `logEsiErrorAndReturnNull` called a nonexistent `e.json()`. They now return null only for `EsiError` (`genNullOnEsiError`).
- The order book error message read a `statusCode` the error did not have. `EsiError.message` now includes the status.
- Public Lambdas needed ESI secrets. `new EsiClient({ userAgent })` works without SSO config.
- The Lambda zip did not include `eve-esi-client`. It now includes `eve-esi`.
