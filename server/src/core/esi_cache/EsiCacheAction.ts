import { addSeconds } from 'date-fns';
import { EsiCache } from './EsiCache';

export enum EsiCacheItem {
  ASSETS,
  STRUCTURE,
}

/*
* Service to manage MySql caching. The purpose of this is to query
* ESI and store the result in MySql.
*/

/*
* Adds data to the cache. If data for the same key already exists,
* it will replace it.
*/
async function genAdd(
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

/*
* Queries data from the cache. Returns null if the cache is empty
* or if cached data has expired.
* It will also clean up cached data if it has expired
*/
async function genQuery(
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
    // TODO does this work???
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

/*
* This function will check the cache based on the key, item and interval
* and it will return the cached result if it exists, otherwise it will
* run fetchData (non-cached version), cache the result and return it.
* 
* @param key cache key
* @param item cache type
* @param intervalInSec how long to cache data in second
* @param fetchData fetching function
*/
export async function genQueryEsiCache<T>(
  key: string,
  item: EsiCacheItem,
  intervalInSec: number,
  fetchData: () => Promise<T | null>,
): Promise<T | null> {
  const cachedData = await genQuery(
    key,
    item,
  );
  if (cachedData !== null) {
    return JSON.parse(cachedData);
  }

  const data = await fetchData();

  if (data === null) {
    return null;
  }

  await genAdd(
    key,
    item,
    intervalInSec,
    JSON.stringify(data),
  );

  return data;
}

/** Clears the entire Esi Cache. */
export async function genClearEsiCache(): Promise<void> {
  await EsiCache.destroy({
    where: {},
    truncate: true
  });
}

/** Clears Esi Cache for the specific key only. */
export async function genClearEsiCacheByKey(
  key: string,
  item: EsiCacheItem,
): Promise<void> {
  await EsiCache.destroy({
    where: {
      key,
      item: item.toString(),
    }
  });
}