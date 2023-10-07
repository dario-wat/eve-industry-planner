import { isEmpty } from 'underscore';
import { EveIndustryJob } from '../../types/EsiQuery';
import EveSdeData from '../../core/sde/EveSdeData';

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
    return this.sdeData.productBlueprintTimeDataFromTypeId(typeId)?.manufacturing_time
      ?? this.sdeData.productBlueprintTimeDataFromTypeId(typeId)?.reaction_time;
  }
}