import { Model } from 'sequelize-typescript';
import { EveSdeGroup, EveSdeStation, EveSdeType } from '../../types/EveSde';
import { mapify } from '../../lib/util';
import { TypeID } from '../../models/sde/TypeID';
import { GroupID } from '../../models/sde/GroupID';
import { Station } from '../../models/sde/Station';

export default class EveSdeData {

  private static initialized: boolean = false;

  private constructor(
    public readonly types: { [key: number]: EveSdeType },
    public readonly typeByName: { [key: string]: EveSdeType },
    public readonly groups: { [key: number]: EveSdeGroup },
    public readonly stations: { [key: number]: EveSdeStation },
  ) {
  }

  public categoryIdFromTypeId(typeId: number): number {
    const type = this.types[typeId];
    const group = this.groups[type.group_id];
    return group.category_id;
  }

  public static async init(): Promise<EveSdeData> {
    if (this.initialized) {
      throw new Error('EveSdeData is already initialized!');
    }

    const [typesData, groupsData, stationsData] =
      await Promise.all([
        TypeID.findAll(),
        GroupID.findAll(),
        Station.findAll(),
      ]);

    return new EveSdeData(
      mapifySequelize(typesData, 'id'),
      mapifySequelize(typesData, 'name'),
      mapifySequelize(groupsData, 'id'),
      mapifySequelize(stationsData, 'id'),
    );
  }
}

function mapifySequelize(ds: any, key: string): any {
  return mapify(ds.map((d: Model) => d.get()), key);
}