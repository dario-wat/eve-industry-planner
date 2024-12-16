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

  /** Currently returns one character of all linked ones. */
  public async genMainCharacter(): Promise<EsiCharacter | null> {
    const characters = await this.genLinkedCharacters();
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
}