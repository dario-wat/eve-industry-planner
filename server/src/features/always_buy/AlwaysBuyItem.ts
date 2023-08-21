import { DataTypes, Model, Sequelize } from 'sequelize';

/*
* List of TypeIDs that will always be forced to buy instead of computing
* the manufacture tree
*/
export class AlwaysBuyItem extends Model { }

export const alwaysBuyItemModelDefine =
  (sequelize: Sequelize) => AlwaysBuyItem.init(
    {
      characterId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      typeId: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: AlwaysBuyItem.name,
      tableName: 'always_buy_items',
      timestamps: false,
    }
  );