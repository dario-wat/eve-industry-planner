import { Sequelize, DataTypes, Model } from 'sequelize';

/**
 * Will store all products that the user is currently planning to build.
 * This is later used to plan all manufacturing jobs.
 * The products can be put into groups for easier managing. The groups
 * are not separate models, but rather just the string indicator, which
 * is the name of the group. This is done for simplicity.
 */
export class PlannedProduct extends Model {

  declare type_id: number;
  declare quantity: number;
  declare group: string;
}

export const plannedProductModelDefine =
  (sequelize: Sequelize) => PlannedProduct.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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