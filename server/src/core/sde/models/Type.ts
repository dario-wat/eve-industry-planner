import { Sequelize, DataTypes, Model } from 'sequelize';

/*
 * This is an SDE (Static Data Export) model.
 */

export class Type extends Model {}

export const typeModelDefine = (sequelize: Sequelize) =>
  Type.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      group_id: DataTypes.INTEGER,
      name: DataTypes.STRING,
      meta_group_id: DataTypes.INTEGER,
      published: DataTypes.BOOLEAN,
      market_group_id: DataTypes.INTEGER,
      volume: DataTypes.DOUBLE,
    },
    {
      sequelize,
      modelName: Type.name,
      tableName: 'types',
      timestamps: false,
    },
  );
