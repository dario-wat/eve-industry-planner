import { DataTypes, Model, Sequelize } from 'sequelize';

export class EsiCache extends Model {
  static readonly MODEL_NAME: string = 'EsiCache';
}

export const esiCacheModelDefine = (sequelize: Sequelize) => EsiCache.init(
  {
    character_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    item: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiration: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    data: {
      type: DataTypes.TEXT('long'),   // in JSON format
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: EsiCache.MODEL_NAME,
    tableName: 'esi_cache',
    timestamps: false,
  },
);