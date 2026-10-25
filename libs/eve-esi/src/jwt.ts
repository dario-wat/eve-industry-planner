import {
  createPublicKey,
  verify,
  type JsonWebKeyInput,
  type KeyObject,
} from 'node:crypto';
import { EsiSsoError } from './errors.js';

/** The claims of an EVE SSO v2 access token that we read. */
export interface EsiAccessTokenClaims {
  /** `CHARACTER:EVE:<characterId>` */
  sub: string;
  name: string;
  owner: string;
  /** Absent when the token has no scopes. */
  scp?: string | string[];
  exp: number;
  iss: string;
  aud: string | string[];
}

export interface JwtVerifierOptions {
  jwksUrl: string;
  userAgent: string;
  /** Accepted `iss` values. CCP sends either the URL or the bare host. */
  issuers: string[];
  audience: string;
  fetch?: typeof fetch;
}

type Jwk = JsonWebKeyInput['key'] & { kid?: string };

/** Re-fetching keys for an unknown `kid` is allowed at most this often. */
const JWKS_REFETCH_MIN_INTERVAL_MS = 60_000;

function decodeJson(part: string | undefined, what: string): Record<string, unknown> {
  if (part === undefined) {
    throw new EsiSsoError(`Access token is malformed: missing ${what}`);
  }
  try {
    const value: unknown = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  } catch {
    // Fall through.
  }
  throw new EsiSsoError(`Access token is malformed: bad ${what}`);
}

/**
 * Verifies EVE SSO access tokens (RS256 JWTs) against CCP's published keys
 * using only node:crypto. Keys are cached in memory.
 */
export class JwtVerifier {
  readonly #options: JwtVerifierOptions;
  readonly #keys = new Map<string, KeyObject>();
  #lastFetchAt = 0;
  #inflightFetch: Promise<void> | null = null;

  constructor(options: JwtVerifierOptions) {
    this.#options = options;
  }

  async verify(token: string): Promise<EsiAccessTokenClaims> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new EsiSsoError('Access token is malformed: expected 3 parts');
    }
    const [headerPart, payloadPart, signaturePart] = parts;

    const header = decodeJson(headerPart, 'header');
    if (header.alg !== 'RS256') {
      throw new EsiSsoError(`Access token uses unsupported algorithm ${String(header.alg)}`);
    }
    if (typeof header.kid !== 'string') {
      throw new EsiSsoError('Access token header has no kid');
    }

    const key = await this.#keyFor(header.kid);
    const signedData = Buffer.from(`${headerPart}.${payloadPart}`);
    const signature = Buffer.from(signaturePart ?? '', 'base64url');
    if (!verify('sha256', signedData, key, signature)) {
      throw new EsiSsoError('Access token signature is invalid');
    }

    const claims = decodeJson(payloadPart, 'payload');
    this.#checkClaims(claims);
    return claims as unknown as EsiAccessTokenClaims;
  }

  #checkClaims(claims: Record<string, unknown>): void {
    const { iss, aud, exp, sub, name, owner } = claims;
    if (typeof iss !== 'string' || !this.#options.issuers.includes(iss)) {
      throw new EsiSsoError(`Access token issuer is not accepted: ${String(iss)}`);
    }
    const audiences = Array.isArray(aud) ? aud : [aud];
    if (!audiences.includes(this.#options.audience)) {
      throw new EsiSsoError('Access token audience does not include EVE Online');
    }
    if (typeof exp !== 'number' || exp * 1000 <= Date.now()) {
      throw new EsiSsoError('Access token has expired');
    }
    if (typeof sub !== 'string' || typeof name !== 'string' || typeof owner !== 'string') {
      throw new EsiSsoError('Access token is missing sub, name or owner');
    }
  }

  async #keyFor(kid: string): Promise<KeyObject> {
    const cached = this.#keys.get(kid);
    if (cached !== undefined) {
      return cached;
    }
    // Unknown kid: CCP may have rotated keys, so refresh, but not on every bad token.
    if (Date.now() - this.#lastFetchAt >= JWKS_REFETCH_MIN_INTERVAL_MS) {
      await this.#refreshKeys();
    } else if (this.#inflightFetch !== null) {
      await this.#inflightFetch;
    }
    const key = this.#keys.get(kid);
    if (key === undefined) {
      throw new EsiSsoError(`No signing key found for kid ${kid}`);
    }
    return key;
  }

  #refreshKeys(): Promise<void> {
    this.#inflightFetch ??= this.#fetchKeys().finally(() => {
      this.#inflightFetch = null;
    });
    return this.#inflightFetch;
  }

  async #fetchKeys(): Promise<void> {
    const doFetch = this.#options.fetch ?? fetch;
    const response = await doFetch(this.#options.jwksUrl, {
      headers: { 'User-Agent': this.#options.userAgent, Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new EsiSsoError(`Fetching signing keys failed with ${response.status}`, response.status);
    }
    const body = (await response.json()) as { keys?: Jwk[] };
    this.#lastFetchAt = Date.now();
    this.#keys.clear();
    for (const jwk of body.keys ?? []) {
      if (jwk.kty === 'RSA' && typeof jwk.kid === 'string') {
        this.#keys.set(jwk.kid, createPublicKey({ key: jwk, format: 'jwk' }));
      }
    }
  }
}
