import { Service } from 'typedi';
import { EveContractsRes } from '@internal/shared';
import EveQueryService from '../../services/query/EveQueryService';
import EsiTokenlessQueryService from '../../services/query/EsiTokenlessQueryService';
import ActorContext from '../../core/actor_context/ActorContext';

@Service()
export default class ContractsService {

  constructor(
    private readonly eveQuery: EveQueryService,
    private readonly esiQuery: EsiTokenlessQueryService,
  ) { }

  /** Data for the Contracts page. */
  public async genDataForPage(
    actorContext: ActorContext,
  ): Promise<EveContractsRes> {
    const characters = await actorContext.genLinkedCharacters();
    const mainCharacter = await actorContext.genxMainCharacter();
    const characterContracts = await Promise.all(characters.map(async character =>
      this.esiQuery.genxContracts(character.characterId)
    ));
    const contracts = characterContracts.flat();

    const names = await this.eveQuery.genAllNames(
      mainCharacter.characterId,
      contracts.map(
        c => [c.assignee_id, c.acceptor_id, c.issuer_id],
      ).flat(),
    )

    return contracts.map(contract => ({
      title: contract.title,
      status: contract.status,
      price: contract.price,
      type: contract.type,
      availability: contract.availability,
      assignee: names[contract.assignee_id] ?? null,
      issuer: names[contract.issuer_id] ?? null,
      acceptor: names[contract.acceptor_id] ?? null,
      date_expired: contract.date_expired,
      date_accepted: contract.date_accepted ?? null,
    }));
  }
}