import { DataTypes, Model, Sequelize } from 'sequelize';

/*
* List of stations that will be used to check available resources
* (materials).
*/
export class MaterialStation extends Model {
  static readonly MODEL_NAME: string = 'MaterialStation';
}

export const materialStationModelDefine =
  (sequelize: Sequelize) => MaterialStation.init(
    {
      character_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      station_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: MaterialStation.MODEL_NAME,
      tableName: 'material_stations',
      timestamps: false,
    }
  );