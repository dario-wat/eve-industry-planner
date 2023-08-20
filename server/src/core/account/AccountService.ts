import ActorContext from '../actor_context/ActorContext';
import { EsiCharacter } from '../esi/models/EsiCharacter';
import EsiTokenlessQueryService from '../../services/query/EsiTokenlessQueryService';
import { Service } from 'typedi';
import { Account } from './Account';
import { LinkedCharacterRes } from '@internal/shared';

@Service()
export default class AccountService {

  constructor(
    private readonly esiQuery: EsiTokenlessQueryService,
  ) { }

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

  // TODO make this better and add comments
  public async genLinkedCharacters(
    actorContext: ActorContext,
  ): Promise<LinkedCharacterRes> {
    const account = await actorContext.genAccount();
    if (account === null) {
      return [];
    }

    const characters = await account.getEsiCharacters();
    const characterIds = characters.map(c => c.characterId);
    // TODO this should be cleaned up
    const genData = async (characterId: number) => {
      const [portrait, character] = await Promise.all([
        this.esiQuery.genxPortrait(characterId),
        EsiCharacter.findByPk(characterId),
      ]);
      return {
        characterId,
        characterName: character?.get().characterName,
        portrait: portrait.px64x64,
      };
    };

    return await Promise.all(characterIds.map(genData));
  }
}