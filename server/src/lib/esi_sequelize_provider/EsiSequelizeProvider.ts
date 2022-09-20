import { Provider } from 'eve-esi-client';
import { EsiAccount } from '../../models/esi_provider/EsiAccount';
import { EsiCharacter } from '../../models/esi_provider/EsiCharacter';
import { EsiToken } from '../../models/esi_provider/EsiToken';
import { first } from 'underscore';
import EsiSeqCharacter from './EsiSeqCharacter';
import EsiSeqToken from './EsiSeqToken';

export default class EsiSequelizeProvider
  implements Provider<EsiAccount, EsiSeqCharacter, EsiSeqToken> {

  public async getAccount(
    owner: string,
    onLogin?: boolean,
  ): Promise<EsiAccount | null> {
    return await EsiAccount.findByPk(owner);
  }

  public async getCharacter(
    characterId: number,
    onLogin?: boolean,
  ): Promise<EsiSeqCharacter | null> {
    const character = await EsiCharacter.findByPk(characterId);
    if (character === null) {
      return null;
    }
    return new EsiSeqCharacter(character);
  }

  public async getToken(
    characterId: number,
    scopes?: string | string[],
  ): Promise<EsiSeqToken | null> {
    const character = await EsiCharacter.findByPk(characterId);
    const tokens = await character?.getEsiTokens();
    return (tokens && first(tokens) && new EsiSeqToken(first(tokens)!)) || null;
  }

  public async createAccount(owner: string): Promise<EsiAccount> {
    return await EsiAccount.create({ owner });
  }

  public async createCharacter(
    owner: string,
    characterId: number,
    characterName: string,
  ): Promise<EsiSeqCharacter> {
    const character = await EsiCharacter.create({
      characterId,
      characterName,
      ownerId: owner,
    });
    return new EsiSeqCharacter(character);
  }

  public async createToken(
    characterId: number,
    accessToken: string,
    refreshToken: string,
    expires: Date,
    scopes?: string | string[],
  ): Promise<EsiSeqToken> {
    const token = await EsiToken.create({
      characterId,
      accessToken,
      refreshToken,
      expires,
      // scopes,
    });
    return new EsiSeqToken(token);
  }

  public async deleteAccount(owner: string): Promise<void> { }
  public async deleteCharacter(characterId: number): Promise<void> { }
  public async deleteToken(accessToken: string): Promise<void> { }
}