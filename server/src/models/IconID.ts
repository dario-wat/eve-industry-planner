import { Sequelize, DataTypes, Model } from 'sequelize';

/*
* This is an SDE (Static Data Export) model.
*/

export class IconID extends Model {
  static readonly MODEL_NAME: string = 'IconID';
}

export const iconIdModelDefine = (sequelize: Sequelize) => IconID.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    description: DataTypes.STRING,
    icon_file: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: IconID.MODEL_NAME,
    tableName: 'icon_ids',
    timestamps: false,
  },
);