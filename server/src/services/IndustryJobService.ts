import { Token } from "eve-esi-client";
import { Service } from "typedi";
import { utcToZonedTime } from 'date-fns-tz'
import { EveQuery } from "../lib/EveQuery";
import { industryActivity, IndustryActivityKey } from "../lib/IndustryActivity";
import SequelizeQueryService from "./SequelizeQueryService";
import { differenceInSeconds, formatDistanceToNowStrict } from "date-fns";

@Service()
export default class IndustryJobService {

  private readonly PST_TZ = 'America/Los_Angeles';

  constructor(
    private sequelizeService: SequelizeQueryService,
  ) { }

  private async genStationName(token: Token, stationId: number) {
    const [structure, station] = await Promise.all([
      EveQuery.genxStructure(token, stationId),
      EveQuery.genStation(token, stationId),
    ]);
    return structure?.name ?? station?.name;
  }

  public async getData(token: Token, industryJob: any) {
    const currentDatePst = new Date();
    const endDatePst = utcToZonedTime(industryJob.end_date, this.PST_TZ);
    const remainingSeconds =
      Math.max(differenceInSeconds(endDatePst, currentDatePst), 0);

    const remainingTime = formatDistanceToNowStrict(
      endDatePst,
      { addSuffix: true },
    );

    const [idNames, stationName] = await Promise.all([
      this.sequelizeService.genNamesFromTypeIds(
        [industryJob.blueprint_type_id, industryJob.product_type_id]
      ),
      this.genStationName(token, industryJob.station_id),
    ]);

    return {
      activity:
        industryActivity[industryJob.activity_id as IndustryActivityKey]
          .activityName,
      blueprint_name:
        idNames.find((o) => o.id === industryJob.blueprint_type_id).name,
      progress: 1 - remainingSeconds / industryJob.duration,
      remaining_time: remainingTime,
      runs: industryJob.runs,
      location: stationName,
      status: industryJob.status,
      product_name:
        idNames.find((o) => o.id === industryJob.product_type_id).name,
    };
  }
}