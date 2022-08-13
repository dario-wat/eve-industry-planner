import { Sequelize, DataTypes, Model } from 'sequelize';

/*
* This is an SDE (Static Data Export) model.
*/

export class TypeID extends Model {
  static readonly MODEL_NAME: string = 'TypeID';
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
    modelName: TypeID.MODEL_NAME,
    tableName: 'type_ids',
    timestamps: false,
  },
);