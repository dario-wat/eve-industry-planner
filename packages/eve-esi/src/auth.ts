import { EsiSsoError } from './errors.js';
import { JwtVerifier, type EsiAccessTokenClaims } from './jwt.js';
import type { EsiLoginResult, EsiSsoConfig, EsiTokenSet } from './types.js';

export const DEFAULT_SSO_ENDPOINT = 'https://login.eveonline.com';

export interface EsiAuthOptions {
  sso: EsiSsoConfig;
  userAgent: string;
  /** Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

interface SsoTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

function scopesFromClaims(claims: EsiAccessTokenClaims): string[] {
  if (claims.scp === undefined) {
    return [];
  }
  return Array.isArray(claims.scp) ? [...claims.scp] : [claims.scp];
}

/**
 * EVE SSO: login URL, code exchange and token refresh. Makes no storage
 * calls; callers get plain data back.
 */
export class EsiAuth {
  readonly #sso: EsiSsoConfig;
  readonly #endpoint: string;
  readonly #userAgent: string;
  readonly #fetch: typeof fetch | undefined;
  readonly #basicAuth: string;
  readonly #jwt: JwtVerifier;

  constructor(options: EsiAuthOptions) {
    this.#sso = options.sso;
    this.#endpoint = options.sso.endpoint ?? DEFAULT_SSO_ENDPOINT;
    this.#userAgent = options.userAgent;
    this.#fetch = options.fetch;
    this.#basicAuth = Buffer
      .from(`${options.sso.clientId}:${options.sso.secretKey}`)
      .toString('base64');
    this.#jwt = new JwtVerifier({
      jwksUrl: `${this.#endpoint}/oauth/jwks`,
      userAgent: options.userAgent,
      issuers: [this.#endpoint, new URL(this.#endpoint).hostname],
      audience: 'EVE Online',
      fetch: options.fetch,
    });
  }

  /** The URL to send the user to. `state` comes back unchanged on the callback. */
  getLoginUrl(state: string, scopes?: string | string[]): string {
    const scope = Array.isArray(scopes) ? scopes.join(' ') : (scopes ?? '');
    const search = new URLSearchParams({
      response_type: 'code',
      redirect_uri: this.#sso.callbackUri,
      client_id: this.#sso.clientId,
      scope,
      state,
    });
    return `${this.#endpoint}/v2/oauth/authorize?${search.toString()}`;
  }

  /** Swaps the one-time `code` from the callback for tokens and the character. */
  async exchangeCode(code: string): Promise<EsiLoginResult> {
    const { tokens, claims } = await this.#requestTokens({
      grant_type: 'authorization_code',
      code,
    });
    return {
      characterId: Number(claims.sub.split(':').pop()),
      characterName: claims.name,
      ownerHash: claims.owner,
      tokens,
    };
  }

  /** Gets a fresh access token. The refresh token may change, so store the result. */
  async refreshTokens(refreshToken: string): Promise<EsiTokenSet> {
    const { tokens } = await this.#requestTokens({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    return tokens;
  }

  async #requestTokens(
    form: Record<string, string>,
  ): Promise<{ tokens: EsiTokenSet; claims: EsiAccessTokenClaims }> {
    const doFetch = this.#fetch ?? fetch;
    const response = await doFetch(`${this.#endpoint}/v2/oauth/token`, {
      method: 'POST',
      body: new URLSearchParams(form).toString(),
      headers: {
        Authorization: `Basic ${this.#basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.#userAgent,
      },
    });

    if (!response.ok) {
      throw await this.#ssoErrorFrom(response);
    }

    const body = (await response.json()) as SsoTokenResponse;
    const claims = await this.#jwt.verify(body.access_token);
    return {
      claims,
      tokens: {
        accessToken: body.access_token,
        refreshToken: body.refresh_token,
        expiresAt: new Date(Date.now() + body.expires_in * 1000),
        scopes: scopesFromClaims(claims),
      },
    };
  }

  async #ssoErrorFrom(response: Response): Promise<EsiSsoError> {
    let oauthError: string | null = null;
    let description: string | null = null;
    try {
      const body = (await response.json()) as { error?: unknown; error_description?: unknown };
      oauthError = typeof body.error === 'string' ? body.error : null;
      description = typeof body.error_description === 'string' ? body.error_description : null;
    } catch {
      // Body was empty or not JSON.
    }
    const detail = [oauthError, description].filter((part) => part !== null).join(': ');
    return new EsiSsoError(
      `SSO token request failed with ${response.status}` + (detail === '' ? '' : ` (${detail})`),
      response.status,
      oauthError,
    );
  }
}
