import { Sequelize, DataTypes, Model } from 'sequelize';

export class TypeID extends Model { }

export const typeIdModelDefine = (sequelize: Sequelize) => TypeID.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    group_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
  },
  {
    sequelize,
    modelName: "TypeID",
    tableName: 'type_ids',
  },
);