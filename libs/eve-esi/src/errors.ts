/** ESI returned a non-2xx response. */
export class EsiError extends Error {
  override readonly name = 'EsiError';

  constructor(
    /** HTTP status code. */
    readonly status: number,
    readonly method: string,
    /** Request path including the query string, relative to the ESI base URL. */
    readonly path: string,
    /** The `error` field of ESI's JSON error body, or null if there was none. */
    readonly esiMessage: string | null,
    /** The `x-esi-error-limit-remain` response header, or null if absent. */
    readonly errorLimitRemain: number | null,
  ) {
    super(
      `ESI ${method} ${path} failed with ${status}`
      + (esiMessage === null ? '' : `: ${esiMessage}`),
    );
  }
}

/** A code exchange, token refresh, or access token check failed. */
export class EsiSsoError extends Error {
  override readonly name = 'EsiSsoError';

  constructor(
    message: string,
    /** HTTP status from the SSO server, or null if the failure was not HTTP. */
    readonly status: number | null = null,
    /** OAuth `error` code from the SSO response, e.g. `invalid_grant`. */
    readonly oauthError: string | null = null,
  ) {
    super(message);
  }
}

/** `tokens.load` returned null for a character that needs a token. */
export class EsiMissingTokenError extends Error {
  override readonly name = 'EsiMissingTokenError';

  constructor(readonly characterId: number) {
    super(`No ESI token stored for character ${characterId}`);
  }
}

/** An auth or logged-in call was made without the `sso` / `tokens` config. */
export class EsiConfigError extends Error {
  override readonly name = 'EsiConfigError';

  constructor(message: string) {
    super(message);
  }
}
