import { Sequelize, DataTypes, Model } from 'sequelize';

/*
* This is an SDE (Static Data Export) model.
*/

export class CategoryID extends Model { }

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
    modelName: 'CategoryID',
    tableName: 'category_ids',
    timestamps: false,
  },
);