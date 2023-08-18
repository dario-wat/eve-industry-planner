import { LinkedCharacterRes } from '@internal/shared';
import { Service } from 'typedi';
import { random } from 'underscore';
import { CharacterCluster } from '../../models/CharacterCluster';
import EsiTokenlessQueryService from '../query/EsiTokenlessQueryService';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import { Account } from '../../core/account/Account';

@Service()
export default class LinkedCharactersService {

  constructor(
    private readonly esiQuery: EsiTokenlessQueryService,
  ) { }

  /**
   * If the newly logged in character ID is in a cluster, we won't do anything.
   * Once a character is in a cluster, they stay there. Might change that
   * in the future.
   * If the newly logged in character is not in an existing cluster then a new
   * cluster will be made for that user if there was no previously logged in
   * user. If there was a previously logged in user, then we will assign the
   * newly logged in user to the same cluster as previously logged in user.
   * @param newCharacterId Newly logged in character ID
   * @param prevCharacterId Previously logged in character ID
   */
  public async genLink(
    newCharacterId: number,
    prevCharacterId: number | undefined,
  ): Promise<void> {
    const newCharacterCluster = await CharacterCluster.findByPk(newCharacterId);
    if (newCharacterCluster === null) {
      if (prevCharacterId) {
        const prevCharacterCluster =
          await CharacterCluster.findByPk(prevCharacterId);
        await CharacterCluster.create({
          character_id: newCharacterId,
          cluster_id: prevCharacterCluster!.get().cluster_id,
        });
      } else {
        await CharacterCluster.create({
          character_id: newCharacterId,
          cluster_id: random(1, 1000000),
        });
      }
    }
  }

  public async genLinkAccount(
    newCharacter: EsiCharacter,
    existingCharacter: EsiCharacter | null,
  ): Promise<Account> {
    const newCharacterAccount = await newCharacter.getAccount();
    if (newCharacterAccount !== null) {
      return newCharacterAccount;
    }

    if (existingCharacter !== null) {
      // TODO account must exist, how to handle required nll
      const existingAccount = (await existingCharacter.getAccount())!;
      console.log(existingAccount)
      existingAccount.addEsiCharacter(newCharacter);
      return existingAccount;
    } else {
      // TODO finish this 
      const account = await Account.create();
      account.addEsiCharacter(newCharacter);
      return account;
    }
  }

  // TODO there is a bug here, when multiple characters
  // are in the same cluster, but one of them does not have
  // an access token, this will throw
  public async genLinkedCharacters(
    characterId: number,
  ): Promise<LinkedCharacterRes> {
    const cluster = await CharacterCluster.findByPk(characterId);
    if (cluster === null) {
      return [];
    }

    const clusters = await CharacterCluster.findAll({
      where: {
        cluster_id: cluster.get().cluster_id,
      },
    });

    const characterIds = clusters
      .map(c => c.get().character_id)
      .filter(cid => cid !== characterId);

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