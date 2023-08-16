import { Service } from 'typedi';
import { groupBy, uniq } from 'underscore';
import { hoursToSeconds } from 'date-fns';
import { sum } from 'mathjs';
import { mapify } from '../../lib/util';
import EveQueryService from '../query/EveQueryService';
import EveSdeData from '../../core/sde/EveSdeData';
import { EsiCacheItem, genQueryEsiCache } from '../../core/esi_cache/EsiCacheAction';
import { EveAssetsLocationsRes, EveAssetsRes } from '@internal/shared';
import { SHIP } from '../../const/Categories';
import { MaterialStation } from '../../models/MaterialStation';
import { EveAsset } from '../../types/EsiQuery';

type AssetsData = {
  name: string,
  typeId: number,
  categoryId: number | undefined
  quantity: number,
  locationId: number,
  location: string,
  isSingleton: boolean,
}[];

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

  private async genFlatAssets(characterId: number): Promise<AssetsData> {
    const assets = await genQueryEsiCache(
      characterId.toString(),
      EsiCacheItem.ASSETS,
      hoursToSeconds(1),
      async () => await this.eveQuery.genAllAssets(characterId),
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
      characterId,
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
        name: this.sdeData.types[asset.self.type_id]?.name,
        typeId: asset.self.type_id,
        categoryId: this.sdeData.categoryIdFromTypeId(asset.self.type_id),
        quantity: asset.self.quantity,
        locationId: rootLocationId(asset),
        location: locationName(asset),
        isSingleton: asset.self.is_singleton,
      }));
  }

  public async genDataForAssetPage(
    characterId: number,
  ): Promise<EveAssetsRes> {
    const assetsData = await this.genFlatAssets(characterId);
    return assetsData.map(assetData => ({ ...assetData }));
  }

  public async genAssetLocations(
    characterId: number,
  ): Promise<EveAssetsLocationsRes> {
    const assetsData = await this.genFlatAssets(characterId);
    return assetsData.map(assetData => ({
      locationId: assetData.locationId,
      locationName: assetData.location,
    }));
  }

  /**
   * We don't want all assets, but only those that the user has configured.
   * The user cares about assets located only in a specific set of
   * stations stored in MaterialStation.
   */
  public async genAssetsForProductionPlan(
    characterId: number,
  ): Promise<{ [typeId: number]: number }> {
    const materialStations = await MaterialStation.findAll({
      attributes: ['station_id'],
      where: {
        character_id: characterId,
      },
    });
    const stationIds =
      materialStations.map(station => station.get().station_id);

    const allAssets = await this.genFlatAssets(characterId);
    const filteredAssets = allAssets.filter(asset =>
      // Removing outside material station and assembled ships
      stationIds.includes(asset.locationId)
      && !(asset.isSingleton && asset.categoryId === SHIP),
    );
    return Object.fromEntries(
      Object.entries(groupBy(filteredAssets, asset => asset.typeId))
        .map(assetsEntry => ([
          assetsEntry[0],
          sum(assetsEntry[1].map(a => a.quantity)),
        ]))
    );
  }
}