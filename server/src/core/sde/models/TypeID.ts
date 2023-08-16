import { Sequelize, DataTypes, Model } from 'sequelize';

/*
* This is an SDE (Static Data Export) model.
*/

export class TypeID extends Model {
}

export const typeIdModelDefine = (sequelize: Sequelize) => TypeID.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    group_id: DataTypes.INTEGER,
    name: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: TypeID.name,
    tableName: 'type_ids',
    timestamps: false,
  },
);