import { formatDistanceToNowStrict } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { Token } from 'eve-esi-client';
import { Service } from 'typedi';
import { EveContract } from '../types/EsiQuery';
import EveQueryService from './EveQueryService';

const PST_TZ = 'America/Los_Angeles';

@Service()
export default class ContractsService {

  constructor(
    private readonly eveQuery: EveQueryService,
  ) { }

  public async getData(token: Token, contracts: EveContract[]) {
    const names = await this.eveQuery.genAllNames(
      token,
      contracts.map(
        c => [c.assignee_id, c.acceptor_id, c.issuer_id],
      ).flat(),
    )

    const expires = (contract: EveContract) => formatDistanceToNowStrict(
      utcToZonedTime(contract.date_expired, PST_TZ),
      { addSuffix: true },
    );

    return contracts.map(contract => ({
      title: contract.title,
      status: contract.status,
      price: contract.price,
      type: contract.type,
      availability: contract.availability,
      assignee: names[contract.assignee_id] ?? null,
      issuer: names[contract.issuer_id] ?? null,
      acceptor: names[contract.acceptor_id] ?? null,
      end_time_formatted: expires(contract),
    }));
  }
}