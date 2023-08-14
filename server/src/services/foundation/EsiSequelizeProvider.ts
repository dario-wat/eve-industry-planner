import { Provider } from 'eve-esi-client';
import { Service } from 'typedi';
import { difference } from 'underscore';
import memoize from 'memoizee';
import { requiredScopes } from '../../const/EveScopes';
import { EsiAccount } from '../../core/esi/EsiAccount';
import { EsiCharacter } from '../../core/esi/EsiCharacter';
import { EsiToken } from '../../core/esi/EsiToken';

@Service()
export default class EsiSequelizeProvider
  implements Provider<EsiAccount, EsiCharacter, EsiToken> {

  constructor() {
    this.getToken = memoize(
      this.getToken,
      {
        primitive: true,
        async: true,
        preFetch: true,
        maxAge: 2000,   // 2 seconds
      },
    );
  }

  public async getAccount(
    owner: string,
    onLogin?: boolean,
  ): Promise<EsiAccount | null> {
    return await EsiAccount.findByPk(owner);
  }

  public async getCharacter(
    characterId: number,
    onLogin?: boolean,
  ): Promise<EsiCharacter | null> {
    return await EsiCharacter.findByPk(characterId);
  }

  public async getToken(
    characterId: number,
    scopes?: string | string[],
  ): Promise<EsiToken | null> {
    const character = await EsiCharacter.findByPk(characterId);
    const tokens = await character?.getEsiTokens();
    if (!tokens || tokens.length === 0) {
      return null;
    }

    if (!scopes) {
      scopes = [];
    } else if (typeof scopes === 'string') {
      scopes = scopes.split(' ');
    }
    for (const token of tokens) {
      const missingScopes = difference(scopes, token.scopes);
      if (missingScopes.length === 0) {
        return token;
      }
    }

    return null;
  }

  public async createAccount(owner: string): Promise<EsiAccount> {
    return await EsiAccount.create({ owner });
  }

  public async createCharacter(
    owner: string,
    characterId: number,
    characterName: string,
  ): Promise<EsiCharacter> {
    return EsiCharacter.create({ characterId, characterName, ownerId: owner });
  }

  public async createToken(
    characterId: number,
    accessToken: string,
    refreshToken: string,
    expires: Date,
    scopes?: string | string[],
  ): Promise<EsiToken> {
    if (!scopes) {
      scopes = [];
    } else if (typeof scopes === 'string') {
      scopes = scopes.split(' ');
    }
    return await EsiToken.create({
      characterId,
      accessToken,
      refreshToken,
      expires,
      scopes,
    });
  }

  public async deleteAccount(owner: string): Promise<void> {
    throw new Error('Unused');
  }

  public async deleteCharacter(characterId: number): Promise<void> {
    throw new Error('Unused');
  }

  public async deleteToken(accessToken: string): Promise<void> {
    throw new Error('Unused');
  }

  /**
   * Helper getToken function that will apply `requiredScopes` by default
   * so that we don't have to call them everywhere.
   * It will also return a non-nullable version of the token.
   */
  public async genxToken(
    characterId: number,
    scopes: string[] = requiredScopes,
  ): Promise<EsiToken> {
    const token = await this.getToken(characterId, scopes);
    return token!;
  }
}