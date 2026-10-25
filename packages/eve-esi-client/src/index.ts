import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { stringify } from 'node:querystring'

import SingleSignOn, { type Response as SsoTokenResponse } from 'eve-sso'

const { name, version, homepage } = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf8'),
) as { name: string; version: string; homepage?: string }

export type EsiResponse<T> = {
  statusCode: number
  statusMessage: string
  headers: Record<string, string>
  json: () => Promise<T>
}

/** @deprecated Use {@link EsiResponse}; kept for compatibility with upstream types. */
export type Response<T> = EsiResponse<T>

export interface Account {
  owner: string
  deleteAccount(): Promise<void>
  deleteCharacters(): Promise<void>
}

export interface Character {
  owner: string
  characterId: number
  characterName: string
  updateCharacter(owner: string, characterName: string): Promise<void>
  deleteTokens(): Promise<void>
  deleteCharacter(): Promise<void>
}

export interface Token {
  characterId: number
  accessToken: string
  refreshToken: string
  expires: Date
  scopes?: string[]
  updateToken(
    accessToken: string,
    refreshToken: string,
    expires: Date,
    scopes?: string | string[],
  ): Promise<void>
  deleteToken(): Promise<void>
}

export interface Provider<
  A extends Account = Account,
  C extends Character = Character,
  T extends Token = Token,
> {
  getAccount(owner: string, onLogin?: boolean): Promise<A | null>
  getCharacter(characterId: number, onLogin?: boolean): Promise<C | null>
  getToken(
    characterId: number,
    scopes?: string | string[] | null,
  ): Promise<T | null>
  createAccount(owner: string): Promise<A>
  createCharacter(
    owner: string,
    characterId: number,
    characterName: string,
  ): Promise<C>
  createToken(
    characterId: number,
    accessToken: string,
    refreshToken: string,
    expires: Date,
    scopes?: string | string[] | null,
  ): Promise<T>
  deleteAccount(owner: string): Promise<void>
  deleteCharacter(characterId: number): Promise<void>
  deleteToken(accessToken: string): Promise<void>
  genxRefreshToken?(
    token: T,
    refresh: (refreshToken: string) => Promise<SsoTokenResponse>,
  ): Promise<void>
}

export interface Options {
  provider: Provider
  clientId: string
  secretKey: string
  callbackUri: string
  userAgent?: string
  endpoint?: string
}

export class EsiHttpError extends Error {
  readonly response: globalThis.Response

  constructor(response: globalThis.Response) {
    super(`HTTP Error Response: ${response.status} ${response.statusText}`)
    this.response = response
  }
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {}
  headers.forEach((value, key) => {
    record[key.toLowerCase()] = value
  })
  return record
}

function normalizeScopes(
  scopes: string | string[] | null | undefined,
): string[] | null {
  if (scopes == null) {
    return null
  }
  if (typeof scopes === 'string') {
    return scopes.length > 0 ? scopes.split(' ') : []
  }
  return scopes
}

export default class ESI {
  public readonly endpoint: string
  public readonly userAgent: string
  public readonly sso: SingleSignOn
  public readonly provider: Provider

  public constructor(options: Options) {
    this.userAgent =
      options.userAgent ??
      `${name}@${version} - nodejs@${process.version} - ${homepage}`
    this.endpoint = options.endpoint ?? 'https://esi.evetech.net/latest'
    this.provider = options.provider

    this.sso = new SingleSignOn(
      options.clientId,
      options.secretKey,
      options.callbackUri,
      {
        userAgent: this.userAgent,
      },
    )
  }

  public getRedirectUrl(state: string, scopes?: string | string[]): string {
    return this.sso.getRedirectUrl(state, scopes)
  }

  public async register(code: string) {
    const response = await this.sso.getAccessToken(code)

    const { provider } = this
    const { access_token, refresh_token, decoded_access_token, expires_in } =
      response
    const { owner, sub, scp, name } = decoded_access_token
    const characterId = Number(sub.split(':').pop())
    const scopes = normalizeScopes(scp)

    let account = await provider.getAccount(owner, true)

    if (!account) {
      account = await provider.createAccount(owner)
    }

    let character = await provider.getCharacter(characterId, true)

    if (!character) {
      character = await provider.createCharacter(owner, characterId, name)
    } else if (
      character.owner !== account.owner ||
      character.characterName !== name
    ) {
      await character.updateCharacter(owner, name)
    }

    let token = await provider.getToken(characterId, scopes)

    if (!token) {
      token = await provider.createToken(
        characterId,
        access_token,
        refresh_token,
        new Date(Date.now() + expires_in * 1000),
        scopes,
      )
    } else {
      await token.updateToken(
        access_token,
        refresh_token,
        new Date(Date.now() + expires_in * 1000),
      )
    }

    return {
      account,
      character,
      token,
    }
  }

  public async request<T = any>(
    uri: string,
    query?: Record<string, string | number | boolean | null | undefined>,
    body?: Record<string, unknown> | unknown[],
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      statusCodes?: number[]
      headers?: Record<string, string>
      token?: Token
    } = {},
  ): Promise<EsiResponse<T>> {
    const method = options.method ?? (body ? 'POST' : 'GET')
    const statusCodes =
      options.statusCodes ?? (method === 'GET' ? [200] : [200, 201])
    const headers: Record<string, string> = { ...options.headers }

    headers['User-Agent'] = this.userAgent

    if (options.token) {
      const { token } = options

      if (token.expires.getTime() <= Date.now()) {
        if (typeof this.provider.genxRefreshToken === 'function') {
          await this.provider.genxRefreshToken(token, refreshToken =>
            this.sso.getAccessToken(refreshToken, true),
          )
        } else {
          const refreshResponse = await this.sso.getAccessToken(
            token.refreshToken,
            true,
          )
          await token.updateToken(
            refreshResponse.access_token,
            refreshResponse.refresh_token,
            new Date(Date.now() + refreshResponse.expires_in * 1000),
          )
        }
      }

      headers.Authorization = `Bearer ${token.accessToken}`
    }

    let encodedBody: string | undefined

    if (body !== undefined) {
      try {
        encodedBody = JSON.stringify(body)
        headers['Content-Type'] = 'application/json'
      } catch {
        throw new TypeError('Failed to serialize body')
      }
    }

    let path = uri
    if (query) {
      path = `${uri}?${stringify(query)}`
    }

    const url = `${this.endpoint}${path}`
    const response = await fetch(url, {
      method,
      headers,
      body: encodedBody,
    })

    if (!statusCodes.includes(response.status)) {
      throw new EsiHttpError(response)
    }

    const headerRecord = headersToRecord(response.headers)

    return {
      statusCode: response.status,
      statusMessage: response.statusText,
      headers: headerRecord,
      json: async () => (await response.json()) as T,
    }
  }
}
