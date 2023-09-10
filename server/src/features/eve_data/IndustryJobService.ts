import { Service } from 'typedi';
import { differenceInSeconds } from 'date-fns';
import { industryActivity, IndustryActivityKey } from '../../const/IndustryActivity';
import { EveIndustryJob } from '../../types/EsiQuery';
import { EveIndustryJobsRes } from '@internal/shared';
import EveSdeData from '../../core/sde/EveSdeData';
import EveQueryService from '../../core/query/EveQueryService';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';
import ActorContext from '../../core/actor_context/ActorContext';
import { EsiCharacter } from 'core/esi/models/EsiCharacter';

@Service()
export default class IndustryJobService {

  constructor(
    private readonly eveQuery: EveQueryService,
    private readonly esiQuery: EsiTokenlessQueryService,
    private readonly sdeData: EveSdeData,
  ) { }

  /** Data for the Industry Jobs page. */
  public async genDataForPage(
    actorContext: ActorContext,
  ): Promise<EveIndustryJobsRes> {
    const characters = await actorContext.genLinkedCharacters();

    const characterJobs = await Promise.all(characters.map(async character =>
      await this.genSingleCharacterJobDataForPage(character)
    ));

    return characterJobs.flat();
  }

  /**
   * Queries all industry jobs for the given character and returns data
   * for the Industry Jobs page.
   */
  private async genSingleCharacterJobDataForPage(
    character: EsiCharacter,
  ): Promise<EveIndustryJobsRes> {
    const industryJobs = await this.esiQuery.genxIndustryJobs(
      character.characterId,
    );
    return await Promise.all(industryJobs.map(
      job => this.genSingleJobDataForPage(character, job),
    ));
  }

  /** Returns data for a single industry job for the Industry Jobs page. */
  private async genSingleJobDataForPage(
    character: EsiCharacter,
    industryJob: EveIndustryJob,
  ): Promise<EveIndustryJobsRes[number]> {
    const remainingSeconds = Math.max(
      0,  // this is to eliminate negative time
      differenceInSeconds(
        new Date(industryJob.end_date),
        new Date(),
      ),
    );

    const stationName = await this.eveQuery.genStationName(
      character.characterId,
      industryJob.station_id,
    );

    return {
      character_name: character.characterName,
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