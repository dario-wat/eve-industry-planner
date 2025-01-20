import { EsiCharacter } from '../core/esi/models/EsiCharacter';
import ActorContext from '../core/actor_context/ActorContext';

/*
 * According to https://docs.esi.evetech.net/docs/id_ranges.html stations
 * IDs are in range [60.000.000, 64.000.000];
 */
export function isStation(id: number) {
  return id >= 60000000 && id <= 64000000;
}

/**
 * Helper function to perform ESI queries for the whole ActorContext
 * instead of just for an individual character.
 */
export async function genQueryPerCharacter<T>(
  actorContext: ActorContext,
  fn: (character: EsiCharacter) => Promise<T>
): Promise<[EsiCharacter, T][]> {
  const characters = await actorContext.genLoggedInLinkedCharacters();
  return await Promise.all(characters.map(async (character) => [character, await fn(character)]));
}

/** Similar as above, but returns just result. */
export async function genQueryResultPerCharacter<T>(
  actorContext: ActorContext,
  fn: (character: EsiCharacter) => Promise<T>
): Promise<T[]> {
  const dataPerCharacter = await genQueryPerCharacter(actorContext, fn);
  return dataPerCharacter.map((d) => d[1]);
}

/**
 * Similar to genQueryPerCharacter and genQueryFlatResultPerCharacter,
 * but it will combine the character with flattened results.
 */
export async function genQueryFlatPerCharacter<T>(
  actorContext: ActorContext,
  fn: (character: EsiCharacter) => Promise<T[]>
): Promise<[EsiCharacter, T][]> {
  const dataPerCharacter = await genQueryPerCharacter(actorContext, fn);
  return dataPerCharacter.reduce((result, [character, ts]) => {
    ts.forEach((t) => {
      result.push([character, t]);
    });
    return result;
  }, [] as [EsiCharacter, T][]);
}

/**
 * Similar to genQueryPerCharacter, but it will flatten the result array.
 * Works only for functions where fn returns an array.
 */
export async function genQueryFlatResultPerCharacter<T>(
  actorContext: ActorContext,
  fn: (character: EsiCharacter) => Promise<T[]>
): Promise<T[]> {
  const dataPerCharacter = await genQueryPerCharacter(actorContext, fn);
  const results = dataPerCharacter.map((d) => d[1]);
  return results.flat();
}

/**
 * Fetches results for all characters linked to this actor context.
 * Returns the first non-null result or null otherwise.
 * This is useful for example when only one character on the account
 * may have access to the data, e.g. private structures.
 */
export async function genQueryResultIfAvailable<T>(
  actorContext: ActorContext,
  fn: (character: EsiCharacter) => Promise<T | null>
): Promise<T | null> {
  const characters = await actorContext.genLoggedInLinkedCharacters();
  const results = await Promise.all(characters.map((character) => fn(character)));
  return results.find((result) => result !== null) ?? null;
}
