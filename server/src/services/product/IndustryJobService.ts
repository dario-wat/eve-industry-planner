import { Token } from 'eve-esi-client';
import { Service } from 'typedi';
import EveQueryService from '../query/EveQueryService';
import { industryActivity, IndustryActivityKey } from '../../const/IndustryActivity';
import { differenceInSeconds } from 'date-fns';
import { EveIndustryJob } from '../../types/EsiQuery';
import { EveIndustryJobsRes } from '@internal/shared';
import EveSdeData from '../query/EveSdeData';
import EsiQueryService from '../query/EsiQueryService';

@Service()
export default class IndustryJobService {

  constructor(
    private readonly eveQuery: EveQueryService,
    private readonly esiQuery: EsiQueryService,
    private readonly sdeData: EveSdeData,
  ) { }

  public async genData(
    characterId: number,
    token: Token,
  ): Promise<EveIndustryJobsRes> {
    const industryJobs = await this.esiQuery.genxIndustryJobs(
      token,
      characterId,
    );
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

    const stationName = await this.eveQuery.genStationName(
      token,
      industryJob.station_id,
    );

    return {
      activity:
        industryActivity[industryJob.activity_id as IndustryActivityKey]
          .activityName,
      blueprint_name: this.sdeData.types[industryJob.blueprint_type_id].name,
      progress: 1 - remainingSeconds / industryJob.duration,
      end_date: industryJob.end_date,
      runs: industryJob.runs,
      location: stationName,
      status: industryJob.status,
      product_name: this.sdeData.types[industryJob.product_type_id].name,
      product_type_id: industryJob.product_type_id,
      category_id:
        this.sdeData.categoryIdFromTypeId(industryJob.product_type_id),
    };
  }
}