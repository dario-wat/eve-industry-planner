import { EsiError } from './errors.js';
import type { EsiPage } from './types.js';

export const DEFAULT_ESI_BASE_URL = 'https://esi.evetech.net/latest';

/** What every ESI request needs. Built once by the client. */
export interface EsiRequestContext {
  baseUrl: string;
  userAgent: string;
  /** Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

export type EsiQuery = Record<string, string | number | boolean | null | undefined>;

export interface EsiRequestOptions {
  method?: 'GET' | 'POST';
  query?: EsiQuery;
  /** JSON-serialised as the request body. Makes the default method POST. */
  body?: unknown;
  /** Sent as `Authorization: Bearer ...`. Omit for public endpoints. */
  accessToken?: string;
}

export interface EsiRawResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

function buildPath(path: string, query: EsiQuery | undefined): string {
  if (query === undefined) {
    return path;
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  }
  const queryString = search.toString();
  return queryString === '' ? path : `${path}?${queryString}`;
}

function parseNumberHeader(headers: Headers, name: string): number | null {
  const value = headers.get(name);
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function readEsiErrorMessage(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'error' in body) {
      const message = (body as { error: unknown }).error;
      return typeof message === 'string' ? message : null;
    }
  } catch {
    // Body was empty or not JSON.
  }
  return null;
}

/**
 * Makes one ESI request and parses the JSON response.
 * Throws EsiError on any non-2xx status. Network failures from `fetch`
 * propagate unchanged.
 */
export async function esiRequest<T>(
  context: EsiRequestContext,
  path: string,
  options: EsiRequestOptions = {},
): Promise<EsiRawResponse<T>> {
  const method = options.method ?? (options.body === undefined ? 'GET' : 'POST');
  const fullPath = buildPath(path, options.query);

  const headers: Record<string, string> = {
    'User-Agent': context.userAgent,
    Accept: 'application/json',
  };
  if (options.accessToken !== undefined) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }
  let body: string | undefined;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers['Content-Type'] = 'application/json';
  }

  const doFetch = context.fetch ?? fetch;
  const response = await doFetch(`${context.baseUrl}${fullPath}`, {
    method,
    headers,
    body,
  });

  if (!response.ok) {
    throw new EsiError(
      response.status,
      method,
      fullPath,
      await readEsiErrorMessage(response),
      parseNumberHeader(response.headers, 'x-esi-error-limit-remain'),
    );
  }

  return {
    data: (await response.json()) as T,
    status: response.status,
    headers: response.headers,
  };
}

/**
 * Like esiRequest, but for list endpoints that paginate. Reads `x-pages`;
 * endpoints that don't send it count as a single page.
 */
export async function esiRequestPage<T>(
  context: EsiRequestContext,
  path: string,
  options: EsiRequestOptions = {},
): Promise<EsiPage<T>> {
  const response = await esiRequest<T[]>(context, path, options);
  const pages = parseNumberHeader(response.headers, 'x-pages');
  return {
    data: response.data,
    pages: pages !== null && pages >= 1 ? pages : 1,
  };
}
