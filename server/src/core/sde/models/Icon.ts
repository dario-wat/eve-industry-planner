import { Sequelize, DataTypes, Model } from 'sequelize';

/*
 * This is an SDE (Static Data Export) model.
 */

export class Icon extends Model {}

export const iconModelDefine = (sequelize: Sequelize) =>
  Icon.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      icon_file: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: Icon.name,
      tableName: 'icons',
      timestamps: false,
    },
  );
