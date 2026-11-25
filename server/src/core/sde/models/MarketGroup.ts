import { Sequelize, DataTypes, Model } from 'sequelize';

/*
 * This is an SDE (Static Data Export) model.
 */

export class MarketGroup extends Model {}

export const marketGroupModelDefine = (sequelize: Sequelize) =>
  MarketGroup.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      parent_group_id: DataTypes.INTEGER,
      name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: MarketGroup.name,
      tableName: 'sde_market_groups',
      timestamps: false,
    },
  );
