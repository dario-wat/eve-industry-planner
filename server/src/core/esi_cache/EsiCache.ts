import { DataTypes, Model, Sequelize } from 'sequelize';

/**
 * EsiCache is a model for storing ESI data into MySQL. Getting ESI data
 * can be quite expensive and sometimes even the Eve server will cache it.
 * Using this we can cache things into MySQL and release some load of ESI.
 */
export class EsiCache extends Model {
}

export const esiCacheModelDefine = (sequelize: Sequelize) => EsiCache.init(
  {
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      comment: 'Key for caching, e.g. ASSETS'
    },
    item: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      comment: 'Specific ID of the item we want to cache, e.g. 12345 (character ID',
    },
    expiration: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'TTL',
    },
    data: {
      type: DataTypes.TEXT('long'),   // in JSON format
      allowNull: false,
      comment: 'JSON serialized data.',
    },
  },
  {
    sequelize,
    modelName: EsiCache.name,
    tableName: 'esi_cache',
    timestamps: false,
  },
);