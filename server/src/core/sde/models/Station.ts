import { Sequelize, DataTypes, Model } from 'sequelize';

/*
 * This is an SDE (Static Data Export) model.
 */

export class Station extends Model {}

export const stationModelDefine = (sequelize: Sequelize) =>
  Station.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      solar_system_id: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: Station.name,
      tableName: 'sde_stations',
      timestamps: false,
    },
  );
