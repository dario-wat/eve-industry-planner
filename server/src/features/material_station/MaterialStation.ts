import { DataTypes, Model, Sequelize } from 'sequelize';

/**
 * List of stations that will be used to check available resources
 * (materials).
 * We cannot use foreign key because it's possible for the station
 * table to be dropped occasionally since it's part of SDE.
 */
export class MaterialStation extends Model {
}

export const materialStationModelDefine =
  (sequelize: Sequelize) => MaterialStation.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      station_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: MaterialStation.name,
      tableName: 'material_stations',
      timestamps: false,
    }
  );