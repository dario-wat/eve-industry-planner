import type { EsiPage } from './types.js';

/** How many pages `getAll*` fetches at once, unless the caller says otherwise. */
export const DEFAULT_PAGE_CONCURRENCY = 10;

/**
 * Fetches every page of a paged endpoint and returns the rows in page order.
 * Page 1 is fetched alone (it says how many pages exist), then the rest run
 * `concurrency` at a time. The first failure rejects, and no further pages
 * are started.
 */
export async function fetchAllPages<T>(
  getPage: (page: number) => Promise<EsiPage<T>>,
  concurrency: number = DEFAULT_PAGE_CONCURRENCY,
): Promise<T[]> {
  const first = await getPage(1);
  const remaining = first.pages - 1;
  if (remaining <= 0) {
    return first.data;
  }

  const results: T[][] = new Array<T[]>(remaining);
  let nextIndex = 0;
  let failed = false;

  const worker = async (): Promise<void> => {
    while (!failed) {
      const index = nextIndex++;
      if (index >= remaining) {
        return;
      }
      try {
        results[index] = (await getPage(index + 2)).data;
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };

  const workerCount = Math.min(Math.max(1, Math.floor(concurrency)), remaining);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return [first.data, ...results].flat();
}
