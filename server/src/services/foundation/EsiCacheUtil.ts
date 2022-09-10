import { addSeconds } from 'date-fns';
import { EsiCache } from '../../models/EsiCache';

export enum EsiCacheItem {
  ASSETS,
};

/*
* Service to manage MySql caching. The purpose of this is to query
* ESI and store the result in MySql.
*/
export namespace EsiCacheUtil {

  /*
  * Adds data to the cache. If data for the same key already exists,
  * it will replace it.
  */
  export async function genAdd(
    key: string,
    item: EsiCacheItem,
    intervalInSec: number,
    data: string,
  ): Promise<EsiCache> {
    // TODO soething broken when destroying
    // Clear existing cache and overwrite
    // await EsiCache.destroy({
    //   where: {
    //     key,
    //     item: item.toString(),
    //   },
    // });

    return await EsiCache.create({
      key: key,
      item: item.toString(),
      expiration: addSeconds(new Date(), intervalInSec),
      data,
    });
  }

  export async function genQuery(
    key: string,
    item: EsiCacheItem,
  ): Promise<string | null> {
    const result = await EsiCache.findOne({
      attributes: ['expiration', 'data'],
      where: {
        key,
        item: item.toString(),
      },
    });

    if (result === null) {
      // Data doesn't exist (not cached)
      return null;
    }

    const esiCacheData = result.get();
    if (new Date() > esiCacheData.expiration) {
      // Data exists, but cache has expired
      await EsiCache.destroy({
        where: {
          key,
          item: item.toString(),
        },
      });
      return null;
    }

    return esiCacheData.data;
  }
}