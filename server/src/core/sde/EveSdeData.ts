import type { Model } from 'sequelize';
import { mapify } from '../../lib/util';
import { Type } from './models/Type';
import { Group } from './models/Group';
import { Station } from './models/Station';
import { SolarSystem } from './models/SolarSystem';
import { Blueprint } from './models/Blueprint';
import { Category } from './models/Category';
import { TRADE_UNIVERSE_EXCLUDED_CATEGORY_IDS } from '../../const/Categories';

export type EveSdeType = {
  id: number;
  name: string;
  group_id: number;
  meta_group_id: number | null;
  published: boolean | null;
  market_group_id: number | null;
  volume: number | null;
};

export type EveSdeGroup = {
  id: number;
  name: string;
  category_id: number;
};

export type EveSdeCategory = {
  id: number;
  name: string;
};

export type EveSdeStation = {
  id: number;
  solar_system_id: number;
};

export type EveSdeSolarSystem = {
  id: number;
  region_id: number;
};

export type EveSdeBlueprintMaterial = {
  blueprint_id: number;
  type_id: number;
  quantity: number;
};

export type EveSdeBlueprint = {
  id: number;
  copying_time: number | null;
  invention_time: number | null;
  manufacturing_time: number | null;
  research_material_time: number | null;
  research_time_time: number | null;
  reaction_time: number | null;
};

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
    public readonly solarSystems: { [solar_system_id: number]: EveSdeSolarSystem },
    public readonly bpManufactureMaterialsByBlueprint: {
      [blueprint_id: number]: EveSdeBlueprintMaterial[];
    },
    public readonly bpManufactureProductsByProduct: { [type_id: number]: EveSdeBlueprintMaterial },
    public readonly bpReactionMaterialsByBlueprint: {
      [blueprint_id: number]: EveSdeBlueprintMaterial[];
    },
    public readonly bpReactionProductsByProduct: { [type_id: number]: EveSdeBlueprintMaterial },
    public readonly blueprints: { [blueprint_id: number]: EveSdeBlueprint },
  ) {}

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

  public regionIdFromStationId(stationId: number): number | undefined {
    const station = this.stations[stationId];
    const solarSystem = station && this.solarSystems[station.solar_system_id];
    return solarSystem?.region_id;
  }

  public typeIdIsReactionFormula(typeId: number): boolean {
    const reactionFormulaGroupIds = [1888, 1889, 1890, 4097];
    const groupId = this.types[typeId]?.group_id;
    return reactionFormulaGroupIds.includes(groupId);
  }

  public productBlueprintFromTypeId(typeId: number): EveSdeBlueprintMaterial | undefined {
    return this.bpManufactureProductsByProduct[typeId] || this.bpReactionProductsByProduct[typeId];
  }

  public productBlueprintTimeDataFromTypeId(typeId: number): EveSdeBlueprint | undefined {
    const blueprintId = this.productBlueprintFromTypeId(typeId)?.blueprint_id;
    return blueprintId !== undefined ? this.blueprints[blueprintId] : undefined;
  }

  /** Published types with a market group, outside the excluded trade categories. */
  private isTradeableType(type: EveSdeType): boolean {
    const categoryId = this.categoryIdFromTypeId(type.id);
    return type.published === true
      && typeof type.market_group_id === 'number'
      && (categoryId === undefined
        || !TRADE_UNIVERSE_EXCLUDED_CATEGORY_IDS.includes(categoryId));
  }

  /** Type IDs that can appear on the regional market and are in scope for station trading. */
  public tradeableTypeIds(): number[] {
    return Object.values(this.types)
      .filter((type) => this.isTradeableType(type))
      .map((type) => type.id);
  }

  /** Tradeable types for the item picker. */
  public tradeableTypes(): { id: number; name: string }[] {
    return Object.values(this.types).flatMap((type) => {
      if (!this.isTradeableType(type)) {
        return [];
      }
      return [{ id: type.id, name: type.name }];
    });
  }

  /** Loads SDE from MySQL into memory. */
  public static async init(): Promise<EveSdeData> {
    if (this.initialized) {
      throw new Error('EveSdeData is already initialized!');
    }

    const typesData = await Type.findAll();
    const groupsData = await Group.findAll();
    const categoriesData = await Category.findAll();
    const stationsData = await Station.findAll();
    const solarSystemsData = await SolarSystem.findAll();
    const blueprintData = await Blueprint.findAll();
    const blueprintIndexes = indexesFromBlueprints(blueprintData);

    return new EveSdeData(
      mapifySequelize(typesData, 'id'),
      mapifySequelize(typesData, 'name'),
      mapifySequelize(groupsData, 'id'),
      mapifySequelize(categoriesData, 'id'),
      mapifySequelize(stationsData, 'id'),
      mapifySequelize(solarSystemsData, 'id'),
      blueprintIndexes.manufactureMaterialsByBlueprint,
      blueprintIndexes.manufactureProductsByProduct,
      blueprintIndexes.reactionMaterialsByBlueprint,
      blueprintIndexes.reactionProductsByProduct,
      blueprintIndexes.blueprints,
    );
  }
}

/** Helper function to create mapping from ID to data. */
function mapifySequelize<TOut>(ds: Pick<Model, 'get'>[], key: string): Record<string, TOut> {
  return mapify(
    ds.map((d) => d.get()),
    key,
  );
}

function blueprintActivities(value: unknown) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return (parsed ?? {}) as Record<string, {
    time?: number;
    materials?: { typeID: number; quantity: number }[];
    products?: { typeID: number; quantity: number }[];
  } | undefined>;
}

function blueprintLines(
  blueprintId: number,
  lines: { typeID: number; quantity: number }[] | undefined,
): EveSdeBlueprintMaterial[] {
  return (lines ?? []).map((line) => ({
    blueprint_id: blueprintId,
    type_id: line.typeID,
    quantity: line.quantity,
  }));
}

function activityTime(activity: { time?: number } | undefined): number | null {
  return activity?.time ?? null;
}

/** Builds the manufacturing and reaction indexes from each blueprint's activities JSON. */
function indexesFromBlueprints(rows: Blueprint[]) {
  const manufactureMaterialsByBlueprint: { [blueprint_id: number]: EveSdeBlueprintMaterial[] } = {};
  const manufactureProductsByProduct: { [type_id: number]: EveSdeBlueprintMaterial } = {};
  const reactionMaterialsByBlueprint: { [blueprint_id: number]: EveSdeBlueprintMaterial[] } = {};
  const reactionProductsByProduct: { [type_id: number]: EveSdeBlueprintMaterial } = {};
  const blueprints: { [blueprint_id: number]: EveSdeBlueprint } = {};

  for (const row of rows) {
    const id = row.get('id') as number;
    const activities = blueprintActivities(row.get('activities'));

    const manufacturingMaterials = blueprintLines(id, activities.manufacturing?.materials);
    if (manufacturingMaterials.length > 0) {
      manufactureMaterialsByBlueprint[id] = manufacturingMaterials;
    }
    for (const product of blueprintLines(id, activities.manufacturing?.products)) {
      manufactureProductsByProduct[product.type_id] = product;
    }

    const reactionMaterials = blueprintLines(id, activities.reaction?.materials);
    if (reactionMaterials.length > 0) {
      reactionMaterialsByBlueprint[id] = reactionMaterials;
    }
    for (const product of blueprintLines(id, activities.reaction?.products)) {
      reactionProductsByProduct[product.type_id] = product;
    }

    blueprints[id] = {
      id,
      copying_time: activityTime(activities.copying),
      invention_time: activityTime(activities.invention),
      manufacturing_time: activityTime(activities.manufacturing),
      research_material_time: activityTime(activities.research_material),
      research_time_time: activityTime(activities.research_time),
      reaction_time: activityTime(activities.reaction),
    };
  }

  return {
    manufactureMaterialsByBlueprint,
    manufactureProductsByProduct,
    reactionMaterialsByBlueprint,
    reactionProductsByProduct,
    blueprints,
  };
}
