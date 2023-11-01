import { Service } from 'typedi';
import { EveContractsRes } from '@internal/shared';
import EveQueryService from '../../core/query/EveQueryService';
import ActorContext from '../../core/actor_context/ActorContext';
import { genQueryFlatResultPerCharacter } from '../../lib/eveUtil';
import EsiMultiPageQueryService from '../../core/query/EsiMultiPageQueryService';

@Service()
export default class ContractsService {

  constructor(
    private readonly eveQuery: EveQueryService,
    private readonly esiMultiPageQuery: EsiMultiPageQueryService,
  ) { }

  /** Data for the Contracts page. */
  public async genDataForPage(
    actorContext: ActorContext,
  ): Promise<EveContractsRes> {
    const mainCharacter = await actorContext.genxMainCharacter();

    const contracts = await genQueryFlatResultPerCharacter(
      actorContext,
      character => this.esiMultiPageQuery.genxAllContracts(character),
    );

    const names = await this.eveQuery.genAllNames(
      mainCharacter,
      contracts.map(c => [c.assignee_id, c.acceptor_id, c.issuer_id]).flat(),
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