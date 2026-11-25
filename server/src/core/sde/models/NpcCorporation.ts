import { Sequelize, DataTypes, Model } from 'sequelize';

/*
 * This is an SDE (Static Data Export) model.
 */

export class NpcCorporation extends Model {}

export const npcCorporationModelDefine = (sequelize: Sequelize) =>
  NpcCorporation.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      faction_id: DataTypes.INTEGER,
      name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: NpcCorporation.name,
      tableName: 'sde_npc_corporations',
      timestamps: false,
    },
  );
