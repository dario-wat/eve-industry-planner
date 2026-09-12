import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import formUrlEncoded from 'form-urlencoded';
import * as jose from 'jose';
const { name, version, homepage } = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));
export class HTTPFetchError extends Error {
    response;
    constructor(response) {
        super(`HTTP Error Response: ${response.status} ${response.statusText}`);
        this.response = response;
    }
}
const ENDPOINT = 'https://login.eveonline.com';
export default class SingleSignOn {
    clientId;
    callbackUri;
    endpoint;
    host;
    userAgent;
    #authorization;
    #jwks;
    constructor(clientId, secretKey, callbackUri, { endpoint, userAgent, } = {}) {
        this.clientId = clientId;
        this.callbackUri = callbackUri;
        this.#authorization = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
        this.endpoint = endpoint ?? ENDPOINT;
        this.host = new URL(this.endpoint).hostname;
        this.userAgent = userAgent ?? `${name}@${version} - nodejs@${process.version} - ${homepage}`;
        this.#jwks = jose.createRemoteJWKSet(new URL(`${this.endpoint}/oauth/jwks`), {
            headers: {
                'User-Agent': this.userAgent
            }
        });
    }
    getRedirectUrl(state, scopes) {
        let scope = '';
        if (scopes) {
            if (Array.isArray(scopes)) {
                scope = scopes.join(' ');
            }
            else {
                scope = scopes;
            }
        }
        const search = new URLSearchParams({
            response_type: 'code',
            redirect_uri: this.callbackUri,
            client_id: this.clientId,
            scope,
            state
        });
        return `${this.endpoint}/v2/oauth/authorize?${search.toString()}`;
    }
    async getAccessToken(code, isRefreshToken = false) {
        const payload = !isRefreshToken ? {
            grant_type: 'authorization_code',
            code
        } : {
            grant_type: 'refresh_token',
            refresh_token: code,
        };
        const response = await fetch(`${this.endpoint}/v2/oauth/token`, {
            method: 'POST',
            body: formUrlEncoded(payload),
            headers: {
                Host: this.host,
                Authorization: `Basic ${this.#authorization}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': this.userAgent,
            }
        });
        if (!response.ok) {
            throw new HTTPFetchError(response);
        }
        const data = await response.json();
        try {
            const { payload: decoded } = await jose.jwtVerify(data.access_token, this.#jwks, {
                issuer: [this.endpoint, this.host],
                audience: 'EVE Online',
            });
            data.decoded_access_token = decoded;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.log('Error verifying access token JWT: ', message);
            throw err;
        }
        return data;
    }
}
