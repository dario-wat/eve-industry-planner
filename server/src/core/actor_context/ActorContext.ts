import { EsiCharacter } from '../esi/models/EsiCharacter';
import { Account } from '../account/Account';
import memoize from 'memoizee';

/**
 * This class represents the currently logged in user/account/actor.
 * It contains a bunch of data and methods to manage the currently logged in
 * user.
 */
export default class ActorContext {

  constructor(
    public readonly accountId: number | null,
    /** Characters picked in the client's character selector; null means all of them. */
    public readonly selectedCharacterIds: number[] | null = null,
  ) {
    this.genAccount = memoize(
      this.genAccount.bind(this),
      {
        primitive: true,
        async: true,
        preFetch: true,
        maxAge: 2000,   // 2 seconds
      },
    );

    this.genMainCharacter = memoize(
      this.genMainCharacter.bind(this),
      {
        primitive: true,
        async: true,
        preFetch: true,
        maxAge: 2000,   // 2 seconds
      },
    );
  }

  public async genAccount(): Promise<Account | null> {
    if (this.accountId === null) {
      return null;
    }

    return await Account.findByPk(this.accountId);
  }

  public async genxAccount(): Promise<Account> {
    return (await this.genAccount())!;
  }

  /** Currently returns one character of all linked ones, ignoring the selection. */
  public async genMainCharacter(): Promise<EsiCharacter | null> {
    const characters = await this.genLoggedInLinkedCharacters();
    if (characters.length === 0) {
      return null;
    }
    return characters[0];
  }

  public async genxMainCharacter(): Promise<EsiCharacter> {
    return (await this.genMainCharacter())!;
  }

  /** 
   * Fetches a list of EsiCharacters related to this ActorContext. If logged
   * out, returns an empty list.
   */
  public async genLinkedCharacters(): Promise<EsiCharacter[]> {
    const account = await this.genAccount();
    if (account === null) {
      return [];
    }
    return await account.getEsiCharacters();
  }

  /**
   * Similar to genLinkedCharacters, but only returns the ones with valid
   * refresh tokens (i.e. logged in).
   */
  public async genLoggedInLinkedCharacters(): Promise<EsiCharacter[]> {
    const characters = await this.genLinkedCharacters();
    const charactersWithLogin = await Promise.all(characters.map(async character =>
      ({ character, isLoggedIn: await character.isLoggedIn() }))
    );
    return charactersWithLogin
      .filter(({ isLoggedIn }) => isLoggedIn)
      .map(({ character }) => character);
  }

  /**
   * Linked characters narrowed to the selection, logged out ones included.
   * Falls back to all linked characters if none of the selected are linked.
   */
  public async genSelectedCharacters(): Promise<EsiCharacter[]> {
    const characters = await this.genLinkedCharacters();
    const selectedIds = this.selectedCharacterIds;
    if (selectedIds === null) {
      return characters;
    }
    const selected = characters.filter((c) => selectedIds.includes(c.characterId));
    return selected.length > 0 ? selected : characters;
  }

  public async genLoggedInSelectedCharacters(): Promise<EsiCharacter[]> {
    const characters = await this.genSelectedCharacters();
    const isLoggedIn = await Promise.all(characters.map((c) => c.isLoggedIn()));
    return characters.filter((_, i) => isLoggedIn[i]);
  }
}
