export type Options = {
    endpoint?: string;
    userAgent?: string;
};
export type AccessToken = {
    scp: string | string[];
    jti: string;
    kid: string;
    sub: string;
    azp: string;
    name: string;
    owner: string;
    exp: number;
    iss: string;
};
export type Response = {
    access_token: string;
    token_type: string;
    refresh_token: string;
    expires_in: number;
    decoded_access_token: AccessToken;
};
export declare class HTTPFetchError extends Error {
    response: globalThis.Response;
    constructor(response: globalThis.Response);
}
export default class SingleSignOn {
    #private;
    readonly clientId: string;
    readonly callbackUri: string;
    readonly endpoint: string;
    readonly host: string;
    readonly userAgent: string;
    constructor(clientId: string, secretKey: string, callbackUri: string, { endpoint, userAgent, }?: Options);
    getRedirectUrl(state: string, scopes?: string | string[]): string;
    getAccessToken(code: string, isRefreshToken?: boolean): Promise<Response>;
}
