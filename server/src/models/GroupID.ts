import { Sequelize, DataTypes, Model } from 'sequelize';

/*
* This is an SDE (Static Data Export) model.
*/

export class GroupID extends Model { }

export const groupIdModelDefine = (sequelize: Sequelize) => GroupID.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    category_id: DataTypes.INTEGER,
    icon_id: DataTypes.INTEGER,
    name: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: 'GroupID',
    tableName: 'group_ids',
    timestamps: false,
  },
);