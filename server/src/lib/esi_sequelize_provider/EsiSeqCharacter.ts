import { Character } from 'eve-esi-client';
import { EsiCharacter } from '../../models/esi_provider/EsiCharacter';

// TODO finish
export default class EsiSeqCharacter implements Character {

  public readonly owner: string;
  public readonly characterId: number;
  public readonly characterName: string;

  public constructor(character: EsiCharacter) {
    this.owner = 'bullshit';//character.owner;
    this.characterId = character.characterId;
    this.characterName = character.characterName;
  }

  public async updateCharacter(
    owner: string,
    characterName: string
  ): Promise<void> {

  }

  public async deleteTokens(): Promise<void> {

  }

  public async deleteCharacter(): Promise<void> {

  }
}