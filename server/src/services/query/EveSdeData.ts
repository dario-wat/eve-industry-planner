import { Model } from 'sequelize-typescript';
import { groupBy } from 'underscore';
import {
  EveSdeGroup,
  EveSdeStation,
  EveSdeType,
  EveSdeBlueprintMaterial,
} from '../../types/EveSde';
import { mapify } from '../../lib/util';
import { TypeID } from '../../models/sde/TypeID';
import { GroupID } from '../../models/sde/GroupID';
import { Station } from '../../models/sde/Station';
import {
  BpManufacturingMaterials,
  BpManufacturingProducts,
  BpReactionMaterials,
  BpReactionProducts,
} from '../../models/sde/Blueprint';

export default class EveSdeData {

  private static initialized: boolean = false;

  private constructor(
    public readonly types: { [type_id: number]: EveSdeType },
    public readonly typeByName: { [name: string]: EveSdeType },
    public readonly groups: { [group_id: number]: EveSdeGroup },
    public readonly stations: { [station_id: number]: EveSdeStation },
    public readonly bpManufactureMaterialsByBlueprint:
      { [blueprint_id: number]: EveSdeBlueprintMaterial[] },
    public readonly bpManufactureProductsByProduct:
      { [type_id: number]: EveSdeBlueprintMaterial },
    public readonly bpReactionMaterialsByBlueprint:
      { [blueprint_id: number]: EveSdeBlueprintMaterial[] },
    public readonly bpReactionProductsByProduct:
      { [type_id: number]: EveSdeBlueprintMaterial },
  ) { }

  public categoryIdFromTypeId(typeId: number): number | undefined {
    const type = this.types[typeId];
    const group = type && this.groups[type.group_id];
    return group?.category_id;
  }

  public typeIdIsReactionFormula(typeId: number): boolean {
    const reactionFormulaGroupIds = [1888, 1889, 1890, 4097];
    const groupId = this.types[typeId]?.group_id;
    return reactionFormulaGroupIds.includes(groupId);
  }

  public static async init(): Promise<EveSdeData> {
    if (this.initialized) {
      throw new Error('EveSdeData is already initialized!');
    }

    const [
      typesData,
      groupsData,
      stationsData,
      bpManufactureMaterialsData,
      bpManufactureProductsData,
      bpReactionMaterialsData,
      bpReactionProductsData,
    ] =
      await Promise.all([
        TypeID.findAll(),
        GroupID.findAll(),
        Station.findAll(),
        BpManufacturingMaterials.findAll(),
        BpManufacturingProducts.findAll(),
        BpReactionMaterials.findAll(),
        BpReactionProducts.findAll(),
      ]);

    return new EveSdeData(
      mapifySequelize(typesData, 'id'),
      mapifySequelize(typesData, 'name'),
      mapifySequelize(groupsData, 'id'),
      mapifySequelize(stationsData, 'id'),
      mapifyMultiSequelize(bpManufactureMaterialsData, 'blueprint_id'),
      mapifySequelize(bpManufactureProductsData, 'type_id'),
      mapifyMultiSequelize(bpReactionMaterialsData, 'blueprint_id'),
      mapifySequelize(bpReactionProductsData, 'type_id'),
    );
  }
}

function mapifySequelize(ds: any, key: string): any {
  return mapify(ds.map((d: Model) => d.get()), key);
}

function mapifyMultiSequelize(ds: any, key: string): any {
  return groupBy(ds.map((d: Model) => d.get()), (elem: any) => elem[key]);
}