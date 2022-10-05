import { Service } from 'typedi';
import { Scribble } from '../models/Scribble';

@Service()
export default class ScribbleService {

  // TODO needs type
  public static async genAll(characterId: number) {
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
  ) {
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
}