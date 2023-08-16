import { isEmpty } from 'underscore';
import { sum } from 'mathjs';
import { EveIndustryJob } from '../../../types/EsiQuery';
import { MANUFACTURING, REACTION } from '../../../const/IndustryActivity';
import EveSdeData, { EveSdeBlueprint } from '../../../core/sde/EveSdeData';

// This code is very ugly, but I don't care, it stays here
export default class ProductionPlanCreationUtil {

  constructor(
    private readonly industryJobs: EveIndustryJob[],
    private readonly assets: { [typeId: number]: number },
    private readonly plannedProductIds: number[],
    private readonly sdeData: EveSdeData,
  ) { }

  public getProductionCategory(typeId: number): string {
    if (this.plannedProductIds.includes(typeId)) {
      return 'End Product / Other';
    }

    const groupId = this.sdeData.types[typeId].group_id;
    switch (groupId) {
      case 334: return 'Construction Components';
      case 428: return 'Intermediate Materials';
      case 429: return 'Composite Materials';
      case 873: return 'Capital Components';
      case 964: return 'Hybrid Tech Components';
      case 974: return 'Hybrid Reactions';
      case 4096: return 'Biochem Reactions';
      default: return 'Other';
    }
  }

  public activeManufacturingRuns(typeId: number): number {
    const qualifiedJobs = this.industryJobs.filter(j =>
      j.activity_id === MANUFACTURING && j.product_type_id === typeId
    );
    return sum(qualifiedJobs.map(job => job.runs));
  }

  public activeReactionRuns(typeId: number): number {
    const qualifiedJobs = this.industryJobs.filter(j =>
      j.activity_id === REACTION && j.product_type_id === typeId
    );
    return sum(qualifiedJobs.map(job => job.runs));
  }

  public blueprintExists(typeId: number): boolean {
    const blueprintId = this.sdeData.productBlueprintFromTypeId(typeId)
      ?.blueprint_id;
    return blueprintId !== undefined
      && (
        blueprintId in this.assets
        || this.industryJobContainsBlueprint(blueprintId)
      );
  }

  private industryJobContainsBlueprint(blueprintId: number): boolean {
    return !isEmpty(this.industryJobs.filter(job =>
      job.blueprint_type_id === blueprintId,
    ));
  }

  public blueprintManufactureTime(typeId: number): number | undefined {
    return this.blueprintTimeData(typeId)?.manufacturing_time
      ?? this.blueprintTimeData(typeId)?.reaction_time;
  }

  private blueprintTimeData(typeId: number): EveSdeBlueprint | undefined {
    const blueprintId = this.sdeData.productBlueprintFromTypeId(
      typeId,
    )?.blueprint_id;
    return blueprintId !== undefined
      ? this.sdeData.blueprints[blueprintId]
      : undefined;
  }
}