import { Account } from 'eve-esi-client';
import { EsiAccount } from '../../models/esi_provider/EsiAccount';

// TODO finish
export default class EsiSeqAccount implements Account {

  public readonly owner: string;

  public constructor(account: EsiAccount) {
    this.owner = account.owner;
  }

  public async deleteAccount(): Promise<void> {

  }

  public async deleteCharacters(): Promise<void> {

  }
}