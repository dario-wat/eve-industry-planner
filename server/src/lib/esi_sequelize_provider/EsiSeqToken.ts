import { Token } from 'eve-esi-client';
import { EsiToken } from '../../models/esi_provider/EsiToken';

export default class EsiSeqToken implements Token {

  public readonly characterId: number;
  public readonly accessToken: string;
  public readonly refreshToken: string;
  public readonly expires: Date;
  public readonly scopes?: string[];

  public constructor(token: EsiToken) {
    this.characterId = 1;
    this.accessToken = token.access_token;
    this.refreshToken = token.refresh_token;
    this.expires = token.expires;
    this.scopes = undefined;
  }

  public async updateToken(
    accessToken: string,
    refreshToken: string,
    expires: Date,
    scopes?: string | string[]
  ): Promise<void> {

  }

  public async deleteToken(): Promise<void> {

  }
}