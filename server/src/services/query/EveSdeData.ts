import { Model } from 'sequelize-typescript';
import { Service } from 'typedi';
import { EveGroup, EveType } from '../../types/EveSdeQuery';
import { mapify } from '../../lib/util';
import { TypeID } from '../../models/sde/TypeID';
import { GroupID } from '../../models/sde/GroupID';

export default class EveSdeData {

  private static initialized: boolean = false;

  private constructor(
    public readonly types: { [key: number]: EveType },
    public readonly typeByName: { [key: string]: EveType },
    public readonly groups: { [key: number]: EveGroup },
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

    const [typesData, groupsData] =
      await Promise.all([TypeID.findAll(), GroupID.findAll()]);

    return new EveSdeData(
      mapifySequelize(typesData, 'id'),
      mapifySequelize(typesData, 'name'),
      mapifySequelize(groupsData, 'id'),
    );
  }
}

function mapifySequelize(ds: any, key: string): any {
  return mapify(ds.map((d: Model) => d.get()), key);
}