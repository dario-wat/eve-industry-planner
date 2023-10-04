import { DataTypes, Model, Sequelize } from 'sequelize';

/** 
 * List of TypeIDs that will always be forced to buy instead of computing
 * the manufacture tree. Ideally these would be defined through an N-to-N
 * relationship between Account and TypeID. However, since TypeID is a part
 * of SDE, the table will occasionally be dropped and rebuilt thus making
 * it impossible to use foreign keys.
 * So for that reason we use this AlwaysBuyItem model that contains the
 * type ID.
 */
export class AlwaysBuyItem extends Model {
  declare typeId: number;
}

export const alwaysBuyItemModelDefine =
  (sequelize: Sequelize) => AlwaysBuyItem.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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