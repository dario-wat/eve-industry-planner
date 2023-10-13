import { Sequelize, DataTypes, Model } from 'sequelize';

/*
* This is an SDE (Static Data Export) model.
*/

export class InvItem extends Model {
}

export const invItemModelDefine = (sequelize: Sequelize) => InvItem.init(
  {
    item_id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    type_id: DataTypes.INTEGER
  },
  {
    sequelize,
    modelName: InvItem.name,
    tableName: 'inv_items',
    timestamps: false
  },
);