import type { EsiAuth } from './auth.js';
import { EsiMissingTokenError } from './errors.js';
import type { EsiTokenHooks, EsiTokenSet } from './types.js';

/** A token that expires within this long is refreshed before use. */
export const TOKEN_REFRESH_MARGIN_MS = 60_000;

/**
 * Hands out valid access tokens for characters. Loads the stored tokens,
 * refreshes them when they are about to expire, and saves the result, all
 * through the app's hooks. Holds no tokens of its own.
 *
 * Concurrent requests for the same character share one refresh. That
 * matters because the refresh token may rotate: a second refresh with the
 * old one would fail.
 */
export class TokenManager {
  readonly #auth: EsiAuth;
  readonly #hooks: EsiTokenHooks;
  /** Refreshes currently running, by character. Resolve to the new access token. */
  readonly #inflight = new Map<number, Promise<string>>();
  /** Bumped when a refresh finishes, so a stale `load` result can be detected. */
  readonly #versions = new Map<number, number>();

  constructor(auth: EsiAuth, hooks: EsiTokenHooks) {
    this.#auth = auth;
    this.#hooks = hooks;
  }

  /**
   * A valid access token for the character.
   * Throws EsiMissingTokenError if nothing is stored, EsiSsoError if the
   * refresh is rejected, and whatever `load` / `save` throw.
   */
  async getAccessToken(characterId: number): Promise<string> {
    for (;;) {
      const running = this.#inflight.get(characterId);
      if (running !== undefined) {
        return await running;
      }

      const versionBeforeLoad = this.#versions.get(characterId) ?? 0;
      const tokens = await this.#hooks.load(characterId);
      if (tokens === null) {
        throw new EsiMissingTokenError(characterId);
      }
      if (tokens.expiresAt.getTime() - Date.now() > TOKEN_REFRESH_MARGIN_MS) {
        return tokens.accessToken;
      }

      // Everything from here to #startRefresh is synchronous, so two callers
      // can never both start a refresh.
      const startedMeanwhile = this.#inflight.get(characterId);
      if (startedMeanwhile !== undefined) {
        return await startedMeanwhile;
      }
      if ((this.#versions.get(characterId) ?? 0) !== versionBeforeLoad) {
        // A refresh finished while we were loading, so `tokens` may be the
        // old set. Load again instead of refreshing with a used refresh token.
        continue;
      }
      return await this.#startRefresh(characterId, tokens);
    }
  }

  #startRefresh(characterId: number, tokens: EsiTokenSet): Promise<string> {
    const refresh = (async () => {
      const fresh = await this.#auth.refreshTokens(tokens.refreshToken);
      await this.#hooks.save(characterId, fresh);
      return fresh.accessToken;
    })().finally(() => {
      this.#inflight.delete(characterId);
      this.#versions.set(characterId, (this.#versions.get(characterId) ?? 0) + 1);
    });
    this.#inflight.set(characterId, refresh);
    return refresh;
  }
}
