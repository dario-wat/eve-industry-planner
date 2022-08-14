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
    const idNames = await this.sequelizeService.genNamesFromTypeIds(
      [industryJob.blueprint_type_id, industryJob.product_type_id]
    );

    const structure = await EveQuery.genxStructure(token, industryJob.station_id);
    const station = await EveQuery.genStation(token, industryJob.station_id);
    const stationName = structure ? structure.name : station ? station.name : null;
    return {
      activity:
        industryActivity[industryJob.activity_id as IndustryActivityKey]
          .activityName,
      blueprint_name: idNames.find((o) => o.id === industryJob.blueprint_type_id).name,
      duration: industryJob.duration, // TODO
      end_date: industryJob.end_date, // TODO
      runs: industryJob.runs,
      location: stationName,
      status: industryJob.status,
      product_name: idNames.find((o) => o.id === industryJob.product_type_id).name,
    };
  }
}