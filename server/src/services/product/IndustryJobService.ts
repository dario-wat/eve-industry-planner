import { Service } from 'typedi';
import { differenceInSeconds } from 'date-fns';
import { industryActivity, IndustryActivityKey } from '../../const/IndustryActivity';
import { EveIndustryJob } from '../../types/EsiQuery';
import { EveIndustryJobsRes } from '@internal/shared';
import EveSdeData from '../../core/sde/EveSdeData';
import EveQueryService from '../query/EveQueryService';
import EsiTokenlessQueryService from '../query/EsiTokenlessQueryService';

@Service()
export default class IndustryJobService {

  constructor(
    private readonly eveQuery: EveQueryService,
    private readonly esiQuery: EsiTokenlessQueryService,
    private readonly sdeData: EveSdeData,
  ) { }

  public async genData(characterId: number): Promise<EveIndustryJobsRes> {
    const industryJobs = await this.esiQuery.genxIndustryJobs(characterId);
    return await Promise.all(industryJobs.map(
      job => this.genSingle(characterId, job),
    ));
  }

  private async genSingle(characterId: number, industryJob: EveIndustryJob) {
    const remainingSeconds = Math.max(
      0,  // this is to eliminate negative time
      differenceInSeconds(
        new Date(industryJob.end_date),
        new Date(),
      ),
    );

    const stationName = await this.eveQuery.genStationName(
      characterId,
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