import { Service } from 'typedi';
import { differenceInSeconds } from 'date-fns';
import { industryActivity, IndustryActivityKey, MANUFACTURING } from '../../const/IndustryActivity';
import { EveIndustryJob } from '../../types/EsiQuery';
import { EveIndustryJobHistoryRes, EveIndustryJobsRes } from '@internal/shared';
import EveSdeData from '../../core/sde/EveSdeData';
import EveQueryService from '../../core/query/EveQueryService';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';
import ActorContext from '../../core/actor_context/ActorContext';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import { genQueryFlatResultPerCharacter } from '../../lib/eveUtil';
import { IndustryJob } from './IndustryJob';
import { groupBy } from 'underscore';
import { entries, mapValues, sum } from 'lodash';

@Service()
export default class IndustryJobService {

  constructor(
    private readonly eveQuery: EveQueryService,
    private readonly esiQuery: EsiTokenlessQueryService,
    private readonly sdeData: EveSdeData,
  ) { }

  /** Data for the Industry Jobs page. */
  public async genActiveJobsData(
    actorContext: ActorContext,
  ): Promise<EveIndustryJobsRes> {
    await this.genSyncIndustryJobs(actorContext);

    return await genQueryFlatResultPerCharacter(
      actorContext,
      character => this.genSingleCharacterActiveJobData(character),
    );
  }

  /**
   * Queries all industry jobs for the given character and returns data
   * for the Industry Jobs page.
   */
  private async genSingleCharacterActiveJobData(
    character: EsiCharacter,
  ): Promise<EveIndustryJobsRes> {
    const industryJobs = await this.esiQuery.genxIndustryJobs(
      character.characterId,
    );
    return await Promise.all(industryJobs.map(
      job => this.genSingleActiveJobData(character, job),
    ));
  }

  /** Returns data for a single industry job for the Industry Jobs page. */
  private async genSingleActiveJobData(
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
      character,
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

  /**
   * Queries all delivered manufacturing jobs and counts the number
   * of products built for each unique product type ID.
   */
  public async genJobHistory(
    actorContext: ActorContext,
  ): Promise<EveIndustryJobHistoryRes> {
    await this.genSyncIndustryJobs(actorContext);

    const industryJobs = await genQueryFlatResultPerCharacter(
      actorContext,
      async character => this.esiQuery.genxIndustryJobs(
        character.characterId,
        true, // include completed
      ),
    );
    const completedJobs = industryJobs.filter(job =>
      job.status === 'delivered' && job.activity_id === MANUFACTURING
    );

    const productCounts = mapValues(
      groupBy(completedJobs, 'product_type_id'),
      jobs => sum(jobs.map(job => job.runs))
    );

    return entries(productCounts).map(([typeIdStr, count]) => {
      const productTypeId = Number(typeIdStr);
      const bp = this.sdeData.productBlueprintFromTypeId(productTypeId);
      return {
        product_name: this.sdeData.types[productTypeId].name,
        product_type_id: productTypeId,
        category_id: this.sdeData.categoryIdFromTypeId(productTypeId),
        category_name: this.sdeData.categoryNameFromTypeId(productTypeId),
        meta: this.sdeData.types[productTypeId]?.meta_group_id,
        count: (bp?.quantity ?? 1) * count,
      }
    });
  }

  /**
   * Queries completed industry jobs from ESI for all character linked to
   * the given ActorContext and stores them into the DB.
   * This is used to increase the retention of this data.
   */
  private async genSyncIndustryJobs(
    actorContext: ActorContext,
  ): Promise<void> {
    const characters = await actorContext.genLinkedCharacters();

    const characterEsiIndustryJobs = await Promise.all(characters.map(
      async character => ([
        character.characterId,
        await this.esiQuery.genxIndustryJobs(
          character.characterId,
          true, // include completed
        ),
      ] as const),
    ));

    const esiIndustryJobs = characterEsiIndustryJobs.flatMap(
      ([characterId, jobs]) => jobs.map(job => ([characterId, job] as const))
    ).filter(([_, jobs]) => jobs.status === 'delivered');

    // Store all industry jobs into the database for longer retention
    await IndustryJob.bulkCreate(
      esiIndustryJobs.map(([characterId, job]) => ({
        characterId,
        ...job,
      })),
      { ignoreDuplicates: true },
    );
  }
}