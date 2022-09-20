import { Provider } from 'eve-esi-client';
import { Service } from 'typedi';
import { difference } from 'underscore';
import { EsiAccount } from '../../models/esi_provider/EsiAccount';
import { EsiCharacter } from '../../models/esi_provider/EsiCharacter';
import { EsiToken } from '../../models/esi_provider/EsiToken';

@Service()
export default class EsiSequelizeProvider
  implements Provider<EsiAccount, EsiCharacter, EsiToken> {

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
}