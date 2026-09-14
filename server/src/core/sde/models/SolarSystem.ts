import { Sequelize, DataTypes, Model } from 'sequelize';

/*
 * This is an SDE (Static Data Export) model.
 */

export class SolarSystem extends Model {}

export const solarSystemModelDefine = (sequelize: Sequelize) =>
  SolarSystem.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      region_id: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: SolarSystem.name,
      tableName: 'solar_systems',
      timestamps: false,
    },
  );
