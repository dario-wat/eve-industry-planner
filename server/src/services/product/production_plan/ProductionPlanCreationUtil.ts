import { isEmpty } from 'underscore';
import { sum } from 'mathjs';
import { EveIndustryJob } from '../../../types/EsiQuery';
import { MANUFACTURING } from '../../../const/IndustryActivity';

export default class ProductionPlanCreationUtil {

  constructor(
    public readonly industryJobs: EveIndustryJob[],
  ) {
  }

  public industryJobContainsBlueprint(blueprintId: number): boolean {
    return !isEmpty(this.industryJobs.filter(job =>
      job.blueprint_type_id === blueprintId,
    ));
  }

  public activeManufacturingRuns(typeId: number): number {
    const qualifiedJobs = this.industryJobs.filter(j =>
      j.activity_id === MANUFACTURING && j.product_type_id === typeId
    );
    return sum(qualifiedJobs.map(job => job.runs));
  }
}