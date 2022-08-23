import { Sequelize, DataTypes, Model } from 'sequelize';

/*
* This is an SDE (Static Data Export) model.
*/

export class Station extends Model {
  static readonly MODEL_NAME: string = 'Station';
}

export const stationModelDefine = (sequelize: Sequelize) => Station.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    name: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: Station.MODEL_NAME,
    tableName: 'stations',
    timestamps: false,
  },
);