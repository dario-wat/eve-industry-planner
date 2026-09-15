import { Sequelize, DataTypes, Model } from 'sequelize';

/*
 * This is an SDE (Static Data Export) model.
 */

export class Group extends Model {}

export const groupModelDefine = (sequelize: Sequelize) =>
  Group.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      category_id: DataTypes.INTEGER,
      icon_id: DataTypes.INTEGER,
      name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: Group.name,
      tableName: 'groups',
      timestamps: false,
    },
  );
