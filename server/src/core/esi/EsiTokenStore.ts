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
 *
 * A character has one login token. Logging in replaces whatever rows the
 * character had, and reads take the newest usable row (EsiToken.genForCharacter).
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
    const token = await EsiToken.genForCharacter(characterId, scopes);
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
    const token = await EsiToken.genForCharacter(characterId, scopes);
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
   * that just logged in, and returns the character. The character ends up
   * with exactly one token row, holding the tokens and scopes of this login.
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

    await EsiToken.sequelize!.transaction(async (transaction) => {
      // Keep the newest row (it may be one the app already uses) and delete
      // any older ones, which earlier logins with other scopes left behind.
      const [newest, ...older] = await EsiToken.findAll({
        where: { characterId },
        order: [['id', 'DESC']],
        transaction,
      });

      const values = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expires: tokens.expiresAt,
        scopes: tokens.scopes,
      };
      if (newest === undefined) {
        await EsiToken.create({ characterId, ...values }, { transaction });
      } else {
        await newest.update(values, { transaction });
      }

      if (older.length > 0) {
        await EsiToken.destroy({
          where: { id: older.map((token) => token.id) },
          transaction,
        });
      }
    });

    return character;
  }
}
