import { Service } from 'typedi';
import { uniq } from 'underscore';
import { hoursToSeconds } from 'date-fns';
import { mapify } from '../../lib/util';
import EveQueryService from '../../core/query/EveQueryService';
import EveSdeData from '../../core/sde/EveSdeData';
import { EsiCacheItem, genQueryEsiCache } from '../../core/esi_cache/EsiCacheAction';
import { EveAssetsLocationsRes, EveAssetsRes } from '@internal/shared';
import { SHIP } from '../../const/Categories';
import { EveAsset } from '../../types/EsiQuery';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import ActorContext from '../../core/actor_context/ActorContext';
import { groupBy, mapValues, mergeWith, sum } from 'lodash';
import { genQueryFlatResultPerCharacter } from '../../lib/eveUtil';

/** Data returned by the flatAsset function. */
type AssetsData = {
  character_name: string,
  name: string,
  typeId: number,
  categoryId: number | undefined
  quantity: number,
  locationId: number,
  location: string,
  isSingleton: boolean,
}[];

/** Assets can have parents (e.g. ammo in a ship). */
type AssetWithParent = {
  self: EveAsset;
  parent: EveAsset | null
};

// It's important to note that this service queries all assets except
// the ones located inside ships
@Service()
export default class AssetsService {

  constructor(
    private readonly eveQuery: EveQueryService,
    private readonly sdeData: EveSdeData,
  ) { }

  /**
   * Finds all assets that are not inside ships. We usually don't care about
   * the stuff inside ships because it's usually ammo or stuff needed for that
   * specific fit.
   * The function will flatten all the assets. I.e. everything that is inside
   * containers will appear as if it is on top level.
   */
  private async genFlatAssets(character: EsiCharacter): Promise<AssetsData> {
    const assets = await genQueryEsiCache(
      character.characterId.toString(),
      EsiCacheItem.ASSETS,
      hoursToSeconds(1),
      async () => await this.eveQuery.genAllAssets(character),
    );

    const assetMap = mapify(assets, 'item_id');
    const assetsWithParent: AssetWithParent[] = assets.map(asset => ({
      self: asset,
      parent: assetMap[asset.location_id] === undefined
        ? null
        : assetMap[asset.location_id],
    }));

    // 1. Asset without parent: 
    //    either inside station, structure, pos(?), customs office(?)
    // 2. Asset with parent:
    //    inside a container, ship or container inside a ship,
    //    the last case is when the parent has its own parent
    // I want to include only items inside stations.

    // Include only assets whose parent doesn't exist. Those are root
    // assets whose location must be station, structure or similar.
    const rootLocationIds = uniq(assetsWithParent
      .filter(o => o.parent === null)
      .map(o => o.self.location_id),
    );
    const stationNames = await this.eveQuery.genAllStationNames(
      character,
      rootLocationIds,
    );

    /*
    *  Helper local functions to build the asset data
    */

    const shouldIncludeAsset = (asset: AssetWithParent) => {
      // Root asset (no parent), but also not a station (e.g. POS, Customs Office)
      const nonStationRootAsset = asset.parent === null
        && stationNames[asset.self.location_id] === undefined;

      // Has a parent, but parent is a ship (asset is inside a ship)
      const insideShipAsset = asset.parent
        && this.sdeData.categoryIdFromTypeId(asset.parent.type_id) === SHIP;

      // Has a parent (container), but parent also has a parent (ship)
      // (inside a container inside a ship)
      const insideContainerShipAsset = asset.parent
        && assetMap[asset.parent.location_id] !== undefined;

      return !(
        nonStationRootAsset || insideShipAsset || insideContainerShipAsset
      )
    };

    const rootLocationId = (asset: AssetWithParent) =>
      (
        rootLocationIds.includes(asset.self.location_id)
        && asset.self.location_id
      )
      || asset.parent!.location_id

    const locationName = (asset: AssetWithParent) =>
      stationNames[asset.self.location_id]
      || (asset.parent && stationNames[asset.parent!.location_id])!;

    return assetsWithParent
      .filter(shouldIncludeAsset)
      .map(asset => ({
        character_name: character.characterName,
        name: this.sdeData.types[asset.self.type_id]?.name,
        typeId: asset.self.type_id,
        categoryId: this.sdeData.categoryIdFromTypeId(asset.self.type_id),
        quantity: asset.self.quantity,
        locationId: rootLocationId(asset),
        location: locationName(asset),
        isSingleton: asset.self.is_singleton,
      }));
  }

  /** Data for the Assets page. */
  public async genDataForAssetPage(
    actorContext: ActorContext,
  ): Promise<EveAssetsRes> {
    const assetsData = await genQueryFlatResultPerCharacter(
      actorContext,
      character => this.genFlatAssets(character),
    );
    return assetsData.map(assetData => ({ ...assetData }));
  }

  /** Returns the list of unique locations of all assets. */
  public async genAssetLocations(
    actorContext: ActorContext,
  ): Promise<EveAssetsLocationsRes> {
    const characters = await actorContext.genLinkedCharacters();
    const characterAssetsData = await Promise.all(characters.map(character =>
      this.genFlatAssets(character),
    ));
    const assetsData = characterAssetsData.flat();
    return uniq(
      assetsData.map(assetData => ({
        locationId: assetData.locationId,
        locationName: assetData.location ?? assetData.locationId,
      })),
      false,
      assetData => assetData.locationId,
    );
  }

  /**
   * We don't want all assets, but only those that the user has configured.
   * The user cares about assets located only in a specific set of
   * stations stored in MaterialStation.
   */
  public async genAssetsForProductionPlan(
    actorContext: ActorContext,
  ): Promise<Record<number, number>> {
    const account = await actorContext.genxAccount();

    const materialStations = await account.getMaterialStations();
    const stationIds = materialStations.map(station => station.station_id);

    const allAssetsFlat = await genQueryFlatResultPerCharacter(
      actorContext,
      character => this.genFlatAssets(character),
    );
    const filteredAssets = allAssetsFlat.filter(asset =>
      // Removing outside material station and assembled ships
      stationIds.includes(asset.locationId) && !isAssembledShip(asset),
    );

    return assetsDataToAssetQuantities(filteredAssets);
  }
}

/** 
 * Takes AssetsData which is an array of assets with a bunch of extra data
 * and reduces it into a single object where typeId is the key and the
 * quantity of that typeId is the value.
 */
function assetsDataToAssetQuantities(assets: AssetsData): Record<number, number> {
  const groups = groupBy(assets, asset => asset.typeId);
  return mapValues(groups, v => sum(v.map(asset => asset.quantity)));
}

/** Checks whether a single asset is an assembled ship. */
function isAssembledShip(asset: AssetsData[number]): boolean {
  return asset.isSingleton && asset.categoryId === SHIP;
}

/** Takes two objects of assets quantities and merges them together. */
export function mergeAssetQuantities(
  assets1: Record<number, number>,
  assets2: Record<number, number>,
): Record<number, number> {
  return mergeWith({}, assets1, assets2, (objVal, srcVal) =>
    (objVal || 0) + srcVal
  );
}