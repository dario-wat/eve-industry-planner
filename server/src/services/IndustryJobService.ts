import { Token } from 'eve-esi-client';
import { Service } from 'typedi';
import { utcToZonedTime } from 'date-fns-tz'
import EveQueryService from './EveQueryService';
import { industryActivity, IndustryActivityKey } from '../lib/IndustryActivity';
import SequelizeQueryService from './SequelizeQueryService';
import { differenceInSeconds } from 'date-fns';
import { EveIndustryJob } from '../types/EsiQuery';

const PST_TZ = 'America/Los_Angeles';

@Service()
export default class IndustryJobService {

  constructor(
    private readonly sequelizeQuery: SequelizeQueryService,
    private readonly eveQuery: EveQueryService,
  ) { }

  public async getData(token: Token, industryJobs: EveIndustryJob[]) {
    return await Promise.all(industryJobs.map(
      job => this.genSingle(token, job),
    ));
  }

  private async genSingle(token: Token, industryJob: EveIndustryJob) {
    const remainingSeconds = Math.max(
      0,  // this is to eliminate negative time
      differenceInSeconds(
        new Date(industryJob.end_date),
        new Date(),
      ),
    );

    const [idNames, stationName] = await Promise.all([
      this.sequelizeQuery.genEveTypes(
        [industryJob.blueprint_type_id, industryJob.product_type_id]
      ),
      this.eveQuery.genStationName(token, industryJob.station_id),
    ]);

    return {
      activity:
        industryActivity[industryJob.activity_id as IndustryActivityKey]
          .activityName,
      blueprint_name: idNames[industryJob.blueprint_type_id].name,
      progress: 1 - remainingSeconds / industryJob.duration,
      end_date: industryJob.end_date,
      runs: industryJob.runs,
      location: stationName,
      status: industryJob.status,
      product_name: idNames[industryJob.product_type_id].name,
    };
  }
}