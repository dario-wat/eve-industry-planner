import { Sequelize, DataTypes, Model } from 'sequelize';

/*
* This is an SDE (Static Data Export) model.
*/

export class InvUniqueName extends Model {
}

export const invUniqueNameModelDefine = (sequelize: Sequelize) =>
  InvUniqueName.init(
    {
      item_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
      },
      item_name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: InvUniqueName.name,
      tableName: 'inv_unique_names',
      timestamps: false
    },
  );