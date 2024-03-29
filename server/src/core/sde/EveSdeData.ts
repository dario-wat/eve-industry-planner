import { Model } from 'sequelize-typescript';
import { groupBy } from 'underscore';
import { mapify } from '../../lib/util';
import { TypeID } from './models/TypeID';
import { GroupID } from './models/GroupID';
import { Station } from './models/Station';
import {
  Blueprint,
  BpManufacturingMaterials,
  BpManufacturingProducts,
  BpReactionMaterials,
  BpReactionProducts,
} from './models/Blueprint';
import { CategoryID } from './models/CategoryID';

export type EveSdeType = {
  id: number,
  name: string,
  group_id: number,
  meta_group_id: number,
}

export type EveSdeGroup = {
  id: number,
  name: string,
  category_id: number,
}

export type EveSdeCategory = {
  id: number,
  name: string,
}

export type EveSdeStation = {
  id: number,
  name: string,
  region_id: number,
}

export type EveSdeBlueprintMaterial = {
  blueprint_id: number,
  type_id: number,
  quantity: number,
}

export type EveSdeBlueprint = {
  id: number,
  copying_time: number,
  invention_time: number,
  manufacturing_time: number,
  research_material_time: number,
  research_time_time: number,
  reaction_time: number,
}

/**
 * SDE (Static Data Export) is a collection of data that is static in the
 * EVE universe (e.g. blueprints, stations, types, ...). This data is not
 * queries through ESI, but rather downloaded as a set of YAML files.
 * 
 * We use `loadDataIntoMySqlScript` script to load all YAML files into MySQL.
 * 
 * All the SDE data is loaded into memory when the server starts. This data
 * is used very commonly, and the memory is not big so it's better to preload
 * everything rather than making a lot of queries into MySQL.
 */
export default class EveSdeData {

  private static initialized: boolean = false;

  private constructor(
    public readonly types: { [type_id: number]: EveSdeType },
    public readonly typeByName: { [name: string]: EveSdeType },
    public readonly groups: { [group_id: number]: EveSdeGroup },
    public readonly categories: { [category_id: number]: EveSdeCategory },
    public readonly stations: { [station_id: number]: EveSdeStation },
    public readonly bpManufactureMaterialsByBlueprint:
      { [blueprint_id: number]: EveSdeBlueprintMaterial[] },
    public readonly bpManufactureProductsByProduct:
      { [type_id: number]: EveSdeBlueprintMaterial },
    public readonly bpReactionMaterialsByBlueprint:
      { [blueprint_id: number]: EveSdeBlueprintMaterial[] },
    public readonly bpReactionProductsByProduct:
      { [type_id: number]: EveSdeBlueprintMaterial },
    public readonly blueprints: { [blueprint_id: number]: EveSdeBlueprint },
  ) { }

  public categoryIdFromTypeId(typeId: number): number | undefined {
    const type = this.types[typeId];
    const group = type && this.groups[type.group_id];
    return group?.category_id;
  }

  public categoryNameFromTypeId(typeId: number): string | undefined {
    const type = this.types[typeId];
    const group = type && this.groups[type.group_id];
    const category = group && this.categories[group.category_id];
    return category?.name;
  }

  public typeIdIsReactionFormula(typeId: number): boolean {
    const reactionFormulaGroupIds = [1888, 1889, 1890, 4097];
    const groupId = this.types[typeId]?.group_id;
    return reactionFormulaGroupIds.includes(groupId);
  }

  public productBlueprintFromTypeId(
    typeId: number,
  ): EveSdeBlueprintMaterial | undefined {
    return this.bpManufactureProductsByProduct[typeId]
      || this.bpReactionProductsByProduct[typeId];
  }

  public productBlueprintTimeDataFromTypeId(
    typeId: number,
  ): EveSdeBlueprint | undefined {
    const blueprintId = this.productBlueprintFromTypeId(typeId)?.blueprint_id;
    return blueprintId !== undefined
      ? this.blueprints[blueprintId]
      : undefined;
  }

  /** Loads SDE from MySQL into memory. */
  public static async init(): Promise<EveSdeData> {
    if (this.initialized) {
      throw new Error('EveSdeData is already initialized!');
    }

    const typesData = await TypeID.findAll();
    const groupsData = await GroupID.findAll();
    const categoriesData = await CategoryID.findAll();
    const stationsData = await Station.findAll();
    const bpManufactureMaterialsData = await BpManufacturingMaterials.findAll();
    const bpManufactureProductsData = await BpManufacturingProducts.findAll();
    const bpReactionMaterialsData = await BpReactionMaterials.findAll();
    const bpReactionProductsData = await BpReactionProducts.findAll();
    const blueprintData = await Blueprint.findAll();

    return new EveSdeData(
      mapifySequelize(typesData, 'id'),
      mapifySequelize(typesData, 'name'),
      mapifySequelize(groupsData, 'id'),
      mapifySequelize(categoriesData, 'id'),
      mapifySequelize(stationsData, 'id'),
      mapifyMultiSequelize(bpManufactureMaterialsData, 'blueprint_id'),
      mapifySequelize(bpManufactureProductsData, 'type_id'),
      mapifyMultiSequelize(bpReactionMaterialsData, 'blueprint_id'),
      mapifySequelize(bpReactionProductsData, 'type_id'),
      mapifySequelize(blueprintData, 'id'),
    );
  }
}

/** Helper function to create mapping from ID to data. */
function mapifySequelize<TOut>(
  ds: Pick<Model, 'get'>[],
  key: string,
): Record<string, TOut> {
  return mapify(ds.map(d => d.get()), key);
}

/** Similar as mapifySequelize, but the returned result is an array. */
function mapifyMultiSequelize<TOut>(
  ds: Pick<Model, 'get'>[],
  key: string,
): Record<string, TOut[]> {
  return groupBy(ds.map(d => d.get()), elem => elem[key]);
}
