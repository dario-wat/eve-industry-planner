import { DataTypes, Model, Sequelize } from 'sequelize';
import { random } from 'underscore';

export class CharacterCluster extends Model {

  /**
   * If the newly logged in character ID is in a cluster, we won't do anything.
   * Once a character is in a cluster, they stay there. Might change that
   * in the future.
   * If the newly logged in character is not in an existing cluster then a new
   * cluster will be made for that user if there was no previously logged in
   * user. If there was a previously logged in user, then we will assign the
   * newly logged in user to the same cluster as previously logged in user.
   * @param newCharacterId Newly logged in character ID
   * @param prevCharacterId Previously logged in character ID
   */
  public static async genLink(
    newCharacterId: number,
    prevCharacterId: number | undefined,
  ): Promise<void> {
    const newCharacterCluster = await CharacterCluster.findByPk(newCharacterId);
    if (newCharacterCluster === null) {
      if (prevCharacterId) {
        const prevCharacterCluster =
          await CharacterCluster.findByPk(prevCharacterId);
        await CharacterCluster.create({
          character_id: newCharacterId,
          cluster_id: prevCharacterCluster!.get().cluster_id,
        });
      } else {
        await CharacterCluster.create({
          character_id: newCharacterId,
          cluster_id: random(1, 1000000),
        });
      }
    }
  }
}

export const characterClusterModelDefine = (sequelize: Sequelize) =>
  CharacterCluster.init(
    {
      character_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      cluster_id: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: CharacterCluster.name,
      tableName: 'character_clusters',
    },
  );