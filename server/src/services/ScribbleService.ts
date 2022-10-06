import { Service } from 'typedi';
import { Scribble } from '../models/Scribble';
import { ScribbleRes, ScribblesRes } from '@internal/shared';

@Service()
export default class ScribbleService {

  public static async genAll(characterId: number): Promise<ScribblesRes> {
    const scribbles = await Scribble.findAll({
      where: {
        characterId,
      },
    })
    return scribbles.map(s => s.get());
  }

  public static async genRecreate(
    characterId: number,
    name: string,
    text: string,
  ): Promise<ScribbleRes> {
    await Scribble.destroy({
      where: {
        characterId,
        name,
      },
    });
    const scribble = await Scribble.create({
      characterId,
      name,
      text,
    });
    return scribble.get();
  }

  public static async genDelete(
    characterId: number,
    name: string,
  ): Promise<void> {
    await Scribble.destroy({
      where: {
        characterId,
        name,
      },
    });
  }
}