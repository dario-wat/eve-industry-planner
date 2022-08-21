import { Token } from 'eve-esi-client';
import { Service } from 'typedi';
import { countBy, identity, uniq } from 'underscore';
import { EveContract } from '../types/EsiQuery';
import EsiQueryService from './EsiQueryService';
import EveQueryService from './EveQueryService';
import SequelizeQueryService from './SequelizeQueryService';

@Service()
export default class ContractsService {

  constructor(
    private readonly sequelizeQuery: SequelizeQueryService,
    private readonly eveQuery: EveQueryService,
    private readonly esiQuery: EsiQueryService,
  ) { }

  public async getData(token: Token, contracts: EveContract[]) {
    const ids = contracts.map(c => [c.assignee_id, c.acceptor_id, c.issuer_id]).flat();
    console.log(ids);
    console.log(
      await this.eveQuery.genAllNames(
        token,
        ids,
      )
    );
    return await Promise.all(
      contracts.map(c => this.genSingle(token, c)),
    );
  }

  private async genSingle(token: Token, contract: EveContract) {
    // TODO const alliance: assignee_id
    // date expired
    // acceptor id
    // issuer id
    // assignee
    return {
      title: contract.title,
      status: contract.status,
      price: contract.price,
      type: contract.type,
      availability: contract.availability,
    };
  }
}