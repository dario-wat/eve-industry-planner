import { Sequelize, DataTypes, Model } from 'sequelize';

/*
 * This is an SDE (Static Data Export) model.
 */

export class Category extends Model {}

export const categoryModelDefine = (sequelize: Sequelize) =>
  Category.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: Category.name,
      tableName: 'categories',
      timestamps: false,
    },
  );
