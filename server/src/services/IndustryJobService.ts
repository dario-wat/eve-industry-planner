import { Token } from "eve-esi-client";
import { TypeID } from "../models/TypeID";
import Container, { Service } from "typedi";
import { EveQuery } from "../lib/EveQuery";
import { industryActivity, IndustryActivityKey } from "../lib/IndustryActivity";
import SequelizeService from "./SequelizeService";

@Service()
export default class IndustryJobService {

  constructor(
    private sequelizeService: SequelizeService,
  ) { }

  // TODO rename
  public async transform(token: Token, industryJob: any) {
    console.log(industryJob);
    const names = await this.sequelizeService.genNamesFromTypeIds(
      [industryJob.blueprint_type_id, industryJob.product_type_id]
    );

    return {
      // activity:
      //   industryActivity[industryJob.activity_id as IndustryActivityKey]
      //     .activityName,
      blueprint_name: names[industryJob.blueprint_type_id],
      duration: industryJob.duration,
      end_date: industryJob.end_date,
      runs: industryJob.runs,
      location: industryJob.station_id,
      status: industryJob.status,
      product_name: names[industryJob.product_type_id],
    };
  }
}