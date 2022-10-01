import { DataTypes, Model, Sequelize } from 'sequelize';

export class CharacterCluster extends Model { }

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