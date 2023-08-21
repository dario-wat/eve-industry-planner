import { EsiCharacter } from '../esi/models/EsiCharacter';
import { Account } from '../account/Account';

/**
 * This class represents the currently logged in user/account/actor.
 * It contains a bunch of data and methods to manage the currently logged in
 * user.
 */
export default class ActorContext {

  constructor(
    public readonly accountId: number | null,
  ) { }

  public async genAccount(): Promise<Account | null> {
    if (this.accountId === null) {
      return null;
    }

    return await Account.findByPk(this.accountId);
  }

  public async genxAccount(): Promise<Account> {
    return (await Account.findByPk(this.accountId!))!;
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
}