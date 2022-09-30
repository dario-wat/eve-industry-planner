import { Service } from 'typedi';
import { EveContractsRes } from '@internal/shared';
import EveQueryService from '../query/EveQueryService';
import EsiTokenlessQueryService from '../query/EsiTokenlessQueryService';

@Service()
export default class ContractsService {

  constructor(
    private readonly eveQuery: EveQueryService,
    private readonly esiQuery: EsiTokenlessQueryService,
  ) { }

  public async genData(characterId: number): Promise<EveContractsRes> {
    const contracts = await this.esiQuery.genxContracts(characterId);
    const names = await this.eveQuery.genAllNames(
      characterId,
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