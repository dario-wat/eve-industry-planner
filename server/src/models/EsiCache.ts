import { DataTypes, Model, Sequelize } from 'sequelize';

export class EsiCache extends Model {
  static readonly MODEL_NAME: string = 'EsiCache';
}

export const esiCacheModelDefine = (sequelize: Sequelize) => EsiCache.init(
  {
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    item: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
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