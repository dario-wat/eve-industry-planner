import { EsiCharacter } from '../core/esi/models/EsiCharacter';
import ActorContext from '../core/actor_context/ActorContext';

/*
* According to https://docs.esi.evetech.net/docs/id_ranges.html stations
* IDs are in range [60.000.000, 64.000.000];
*/
export function isStation(id: number) {
  return id >= 60000000 && id <= 64000000;
}

// TODO I dont know if I like this function, maybe move out of here
/**
 * Helper function to perform ESI queries for the whole ActorContext
 * instead of just for an individual character.
 */
export async function genQueryPerCharacter<T>(
  actorContext: ActorContext,
  fn: (characterId: number) => Promise<T>,
): Promise<[EsiCharacter, T][]> {
  const characters = await actorContext.genLinkedCharacters();
  return await Promise.all(characters.map(async character =>
    ([character, await fn(character.characterId)])
  ));
}

/** Similar as above, but returns just result. */
export async function genQueryResultPerCharacter<T>(
  actorContext: ActorContext,
  fn: (characterId: number) => Promise<T>,
): Promise<T[]> {
  const dataPerCharacter = await genQueryPerCharacter(actorContext, fn);
  return dataPerCharacter.map(d => d[1]);
}

/** 
 * Similar to genQueryPerCharacter, but it will flatten the result array.
 * Works only for functions where fn returns an array.
 */
export async function genQueryFlatResultPerCharacter<T>(
  actorContext: ActorContext,
  fn: (characterId: number) => Promise<T[]>,
): Promise<T[]> {
  const dataPerCharacter = await genQueryPerCharacter(actorContext, fn);
  const results = dataPerCharacter.map(d => d[1]);
  return results.flat();
}