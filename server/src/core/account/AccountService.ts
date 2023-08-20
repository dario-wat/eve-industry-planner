import ActorContext from '../actor_context/ActorContext';
import { EsiCharacter } from '../esi/models/EsiCharacter';
import { Service } from 'typedi';
import { Account } from './Account';

@Service()
export default class AccountService {

  constructor() { }

  /**
   * If the newly logged in character is already linked to an account, 
   * we won't do anything. Once a character is linked, they stay that way.
   * Might need to change this in the future.
   * If the newly logged in character is not linked to an existing account,
   * we will either link it to an existing account (if an account is currently
   * logged in), or we will create a new account (if no account is logged in).
   */
  public async genLink(
    actorContext: ActorContext,
    newCharacter: EsiCharacter,
  ): Promise<Account> {
    const newCharacterAccount = await newCharacter.getAccount();
    if (newCharacterAccount !== null) {
      return newCharacterAccount;
    }

    const existingAccount = await actorContext.genAccount();
    if (existingAccount !== null) {
      existingAccount.addEsiCharacter(newCharacter);
      return existingAccount;
    }

    const newAccount = await Account.create();
    newAccount.addEsiCharacter(newCharacter);
    return newAccount;
  }
}