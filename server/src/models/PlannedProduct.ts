import { Sequelize, DataTypes, Model } from 'sequelize';

/*
* Will store all products that the user is currently planning to build.
* This is later used to plan all manufacturing jobs.
*/
export type TPlannedProduct = {
  character_id: number,
  typed_id: number,
  quantity: number,
};

export class PlannedProduct extends Model {
  static readonly MODEL_NAME: string = 'PlannedProduct';
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
    },
    {
      sequelize,
      modelName: PlannedProduct.MODEL_NAME,
      tableName: 'planned_products',
      timestamps: false,
    }
  );