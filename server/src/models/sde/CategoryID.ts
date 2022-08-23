import { Sequelize, DataTypes, Model } from 'sequelize';

/*
* This is an SDE (Static Data Export) model.
*/

export class CategoryID extends Model {
  static readonly MODEL_NAME: string = 'CategoryID';
}

export const categoryIdModelDefine = (sequelize: Sequelize) => CategoryID.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    name: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: CategoryID.MODEL_NAME,
    tableName: 'category_ids',
    timestamps: false,
  },
);