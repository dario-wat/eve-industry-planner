import { Sequelize, DataTypes, Model } from 'sequelize';

/*
* Will store all products that the user is currently planning to build.
* This is later used to plan all manufacturing jobs.
*/
export class PlannedProduct extends Model {
}

export const plannedProductModelDefine =
  (sequelize: Sequelize) => PlannedProduct.init(
    {
      character_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      group: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: PlannedProduct.name,
      tableName: 'planned_products',
      timestamps: false,
    }
  );