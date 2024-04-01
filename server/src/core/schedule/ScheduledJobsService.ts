import { Service } from 'typedi';
import schedule from 'node-schedule';
import WalletService from '../../features/wallet/WalletService';

@Service()
export default class ScheduledJobsService {

  constructor(
    private readonly walletService: WalletService,
  ) { }

  public init(): void {
    schedule.scheduleJob('*/10 * * * *', async () =>
      await this.walletService.genSyncAllWalletTransactions()
    );

    schedule.scheduleJob('*/10 * * * *', async () =>
      await this.walletService.genSyncWalletJournal()
    );
  }
}