import type { EsiLoginResult, EsiTokenSet } from 'eve-esi';
import { Service } from 'typedi';
import { requiredScopes } from '../../const/EveScopes';
import { EsiAccount } from './models/EsiAccount';
import { EsiCharacter } from './models/EsiCharacter';
import { EsiToken } from './models/EsiToken';

/**
 * Stores ESI accounts, characters and tokens in MySQL. The eve-esi library
 * never touches the database: it calls `genLoadTokenSet` / `genxSaveTokenSet`
 * (wired up in EsiClientService) to read and write a character's tokens, and
 * the login controller calls `genxSaveLogin` after a successful login.
 */
@Service()
export default class EsiTokenStore {

  /**
   * Tokens for the library to use, or null if the character has no stored
   * token with all of `scopes`.
   */
  public async genLoadTokenSet(
    characterId: number,
    scopes: string[] = requiredScopes,
  ): Promise<EsiTokenSet | null> {
    const token = await this.genTokenWithScopes(characterId, scopes);
    if (token === null) {
      return null;
    }
    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expires,
      scopes: token.scopes,
    };
  }

  /**
   * Saves tokens the library just refreshed, into the row it loaded them from.
   * The stored scopes are left alone: a refreshed access token can report no
   * scopes, and overwriting would stop the scope match in `genLoadTokenSet`.
   */
  public async genxSaveTokenSet(
    characterId: number,
    tokens: EsiTokenSet,
    scopes: string[] = requiredScopes,
  ): Promise<void> {
    const token = await this.genTokenWithScopes(characterId, scopes);
    if (token === null) {
      throw new Error(`No stored ESI token to update for character ${characterId}`);
    }
    await token.update({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expires: tokens.expiresAt,
    });
  }

  /**
   * Creates or updates the account, character and token rows for a character
   * that just logged in, and returns the character.
   */
  public async genxSaveLogin(login: EsiLoginResult): Promise<EsiCharacter> {
    const { characterId, characterName, ownerHash, tokens } = login;

    await EsiAccount.findOrCreate({ where: { owner: ownerHash } });

    let character = await EsiCharacter.findByPk(characterId);
    if (character === null) {
      character = await EsiCharacter.create({
        characterId,
        characterName,
        owner: ownerHash,
      });
    } else if (character.owner !== ownerHash || character.characterName !== characterName) {
      await character.update({ characterName, owner: ownerHash });
    }

    const existing = await this.genTokenWithScopes(characterId, tokens.scopes);
    if (existing === null) {
      await EsiToken.create({
        characterId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expires: tokens.expiresAt,
        scopes: tokens.scopes,
      });
    } else {
      await existing.update({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expires: tokens.expiresAt,
      });
    }

    return character;
  }

  /** First stored token of the character that has every one of `scopes`. */
  private async genTokenWithScopes(
    characterId: number,
    scopes: string[],
  ): Promise<EsiToken | null> {
    const tokens = await EsiToken.findAll({ where: { characterId } });
    return tokens.find(token => scopes.every(scope => token.scopes.includes(scope))) ?? null;
  }
}
